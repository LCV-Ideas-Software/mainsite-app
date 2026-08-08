/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Cliente REST mínimo do Vertex AI (Gemini Enterprise Agent Platform) para o
 * mainsite-worker. Autentica com service account via JWT RS256 (WebCrypto)
 * trocado por access token OAuth2, com cache por identidade de chave e
 * single-flight para mints concorrentes. Espelha a superfície do SDK
 * @google/genai (models.generateContent / models.countTokens) usada por
 * lib/genai.ts, para manter o diff dos call sites cirúrgico.
 */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  private_key_id: string;
  token_uri: string;
}

export interface VertexGenAIOptions {
  saKeyJson: string;
  project: string;
  location: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface GenerateContentConfig {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  thinkingConfig?: Record<string, unknown>;
  safetySettings?: unknown[];
  systemInstruction?: string | Record<string, unknown>;
}

interface GenerateContentArgs {
  model: string;
  contents: unknown;
  config?: GenerateContentConfig;
}

interface CountTokensArgs {
  model: string;
  contents: unknown;
}

interface VertexResponsePart {
  text?: string;
  thought?: boolean;
}

interface VertexCandidate {
  content?: { parts?: VertexResponsePart[] };
}

export interface VertexGenerateContentResponse {
  candidates?: VertexCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  modelVersion?: string;
  text: string;
}

const OAUTH_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const OAUTH_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const JWT_LIFETIME_S = 3600; // máximo permitido pelo fluxo server-to-server do Google
const JWT_CLOCK_SKEW_S = 30;
const TOKEN_SAFETY_MARGIN_S = 300;
const ERROR_BODY_EXCERPT = 300;

// Cache module-level: sobrevive entre requests no mesmo isolate. Chaveado pela
// identidade da chave para nunca vazar token entre credenciais distintas.
const tokenCache = new Map<string, { token: string; expiresAtMs: number }>();
const inflightMints = new Map<string, Promise<string>>();

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlFromJson(value: unknown): string {
  return base64UrlFromBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function pemToPkcs8Bytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parseServiceAccountKey(saKeyJson: string): ServiceAccountKey {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(saKeyJson);
  } catch (err) {
    throw new Error(
      `VERTEX_SA_KEY inválido: o conteúdo do secret não é JSON parseável (${err instanceof Error ? err.message : 'erro desconhecido'}).`,
      { cause: err },
    );
  }
  for (const field of ['client_email', 'private_key', 'private_key_id', 'token_uri'] as const) {
    if (typeof parsed[field] !== 'string' || !parsed[field]) {
      throw new Error(`VERTEX_SA_KEY inválido: campo obrigatório ausente ou vazio: ${field}`);
    }
  }
  return parsed as unknown as ServiceAccountKey;
}

async function mintAccessToken(
  sa: ServiceAccountKey,
  fetchImpl: typeof fetch,
  nowMs: number,
): Promise<{ token: string; expiresInS: number }> {
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8Bytes(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const iat = Math.floor(nowMs / 1000) - JWT_CLOCK_SKEW_S;
  const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id };
  const claims = {
    iss: sa.client_email,
    scope: OAUTH_SCOPE,
    aud: sa.token_uri,
    iat,
    exp: iat + JWT_LIFETIME_S,
  };
  const signingInput = `${base64UrlFromJson(header)}.${base64UrlFromJson(claims)}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`;

  const res = await fetchImpl(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: OAUTH_GRANT_TYPE, assertion }).toString(),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, ERROR_BODY_EXCERPT);
    throw new Error(`Falha ao obter access token OAuth para ${sa.client_email} (HTTP ${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error(`Resposta do token endpoint sem access_token (HTTP ${res.status}).`);
  }
  return { token: data.access_token, expiresInS: data.expires_in ?? JWT_LIFETIME_S };
}

async function getAccessToken(sa: ServiceAccountKey, fetchImpl: typeof fetch, now: () => number): Promise<string> {
  const cacheKey = `${sa.client_email}|${sa.private_key_id}|${sa.token_uri}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAtMs > now()) {
    return cached.token;
  }
  const existing = inflightMints.get(cacheKey);
  if (existing) {
    return existing;
  }
  const mint = (async () => {
    const { token, expiresInS } = await mintAccessToken(sa, fetchImpl, now());
    tokenCache.set(cacheKey, {
      token,
      expiresAtMs: now() + (expiresInS - TOKEN_SAFETY_MARGIN_S) * 1000,
    });
    return token;
  })();
  inflightMints.set(cacheKey, mint);
  try {
    return await mint;
  } finally {
    inflightMints.delete(cacheKey);
  }
}

function toContents(contents: unknown): unknown {
  if (typeof contents === 'string') {
    return [{ role: 'user', parts: [{ text: contents }] }];
  }
  return contents;
}

function toRestBody(args: GenerateContentArgs): Record<string, unknown> {
  const body: Record<string, unknown> = { contents: toContents(args.contents) };
  const config = args.config;
  if (!config) {
    return body;
  }
  const generationConfig: Record<string, unknown> = {};
  for (const field of ['temperature', 'topP', 'maxOutputTokens', 'thinkingConfig'] as const) {
    if (config[field] !== undefined) {
      generationConfig[field] = config[field];
    }
  }
  if (Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig;
  }
  if (config.systemInstruction !== undefined) {
    body.systemInstruction =
      typeof config.systemInstruction === 'string'
        ? { role: 'user', parts: [{ text: config.systemInstruction }] }
        : config.systemInstruction;
  }
  if (config.safetySettings !== undefined) {
    body.safetySettings = config.safetySettings;
  }
  return body;
}

function extractText(candidates: VertexCandidate[] | undefined): string {
  const parts = candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('');
}

/** Espelha a superfície do SDK @google/genai consumida por lib/genai.ts. */
export class VertexGenAI {
  private readonly options: VertexGenAIOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  readonly models = {
    generateContent: async (args: GenerateContentArgs): Promise<VertexGenerateContentResponse> => {
      const data = (await this.request(args.model, 'generateContent', toRestBody(args))) as Omit<
        VertexGenerateContentResponse,
        'text'
      >;
      return { ...data, text: extractText(data.candidates) };
    },
    countTokens: async (args: CountTokensArgs): Promise<{ totalTokens?: number }> => {
      return (await this.request(args.model, 'countTokens', { contents: toContents(args.contents) })) as {
        totalTokens?: number;
      };
    },
  };

  constructor(options: VertexGenAIOptions) {
    this.options = options;
    // O fetch global do workerd exige `this` global; chamar via this.fetchImpl
    // vazaria a instância como `this` e lança Illegal invocation em produção.
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? Date.now;
  }

  private baseUrl(): string {
    const { location } = this.options;
    return location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`;
  }

  private async request(model: string, verb: string, body: Record<string, unknown>): Promise<unknown> {
    const sa = parseServiceAccountKey(this.options.saKeyJson);
    const token = await getAccessToken(sa, this.fetchImpl, this.now);
    const { project, location } = this.options;
    const url = `${this.baseUrl()}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:${verb}`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, ERROR_BODY_EXCERPT);
      throw new Error(`Vertex ${verb} falhou (HTTP ${res.status}): ${detail}`);
    }
    return res.json();
  }
}
