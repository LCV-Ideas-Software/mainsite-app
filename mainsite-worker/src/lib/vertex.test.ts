/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { expect, it } from 'vitest';
import { VertexGenAI } from './vertex.ts';

const te = new TextEncoder();

function b64urlToBuf(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

function b64urlToJson(s: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

async function makeTestSa(kid: string) {
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
  const pem = `-----BEGIN PRIVATE KEY-----\n${(pkcs8.match(/.{1,64}/g) ?? []).join('\n')}\n-----END PRIVATE KEY-----\n`;
  return {
    publicKey: pair.publicKey,
    saJson: JSON.stringify({
      type: 'service_account',
      project_id: 'proj-x',
      private_key_id: kid,
      private_key: pem,
      client_email: `${kid}@proj-x.iam.gserviceaccount.com`,
      token_uri: 'https://oauth2.test.invalid/token',
    }),
  };
}

function jsonResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

interface MockOpts {
  tokenPayload?: unknown;
  apiPayload?: unknown;
  tokenStatus?: number;
  apiStatus?: number;
  tokenDelay?: () => Promise<void>;
}

function makeFetchMock(opts: MockOpts = {}) {
  const { tokenPayload, apiPayload, tokenStatus = 200, apiStatus = 200, tokenDelay } = opts;
  const calls: { token: Array<{ url: string; init: RequestInit }>; api: Array<{ url: string; init: RequestInit }> } = {
    token: [],
    api: [],
  };
  const fetchImpl = (async (url: string, init: RequestInit) => {
    if (String(url).includes('oauth2.test.invalid')) {
      calls.token.push({ url: String(url), init });
      if (tokenDelay) await tokenDelay();
      return jsonResponse(
        tokenStatus,
        tokenPayload ?? { access_token: 'tok-1', expires_in: 3600, token_type: 'Bearer' },
      );
    }
    calls.api.push({ url: String(url), init });
    return jsonResponse(
      apiStatus,
      apiPayload ?? { candidates: [{ content: { parts: [{ text: 'ok' }] } }], usageMetadata: { promptTokenCount: 1 } },
    );
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function client(sa: { saJson: string }, mock: ReturnType<typeof makeFetchMock>, extra: Record<string, unknown> = {}) {
  return new VertexGenAI({
    saKeyJson: sa.saJson,
    project: 'proj-x',
    location: 'global',
    fetchImpl: mock.fetchImpl,
    ...extra,
  });
}

it('minta JWT RS256 com header/claims do fluxo oficial e troca por access token no token_uri', async () => {
  const sa = await makeTestSa('kid-claims');
  const mock = makeFetchMock();
  await client(sa, mock).models.countTokens({ model: 'm', contents: 'oi' });

  expect(mock.calls.token).toHaveLength(1);
  const req = mock.calls.token[0];
  expect(req.url).toBe('https://oauth2.test.invalid/token');
  expect(req.init.method).toBe('POST');
  expect((req.init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');

  const params = new URLSearchParams(req.init.body as string);
  expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');

  const assertion = params.get('assertion') ?? '';
  const [h, c, s] = assertion.split('.');
  expect(b64urlToJson(h)).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'kid-claims' });

  const claims = b64urlToJson(c) as { iss: string; scope: string; aud: string; iat: number; exp: number };
  const nowSec = Math.floor(Date.now() / 1000);
  expect(claims.iss).toBe('kid-claims@proj-x.iam.gserviceaccount.com');
  expect(claims.scope).toBe('https://www.googleapis.com/auth/cloud-platform');
  expect(claims.aud).toBe('https://oauth2.test.invalid/token');
  expect(claims.exp - claims.iat).toBe(3600);
  expect(claims.iat).toBeLessThanOrEqual(nowSec);
  expect(claims.iat).toBeGreaterThanOrEqual(nowSec - 90);

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', sa.publicKey, b64urlToBuf(s), te.encode(`${h}.${c}`));
  expect(valid).toBe(true);
});

it('envia Authorization Bearer e monta a URL global do generateContent', async () => {
  const sa = await makeTestSa('kid-url-global');
  const mock = makeFetchMock();
  await client(sa, mock).models.generateContent({ model: 'gemini-2.5-flash', contents: 'oi' });

  expect(mock.calls.api).toHaveLength(1);
  expect(mock.calls.api[0].url).toBe(
    'https://aiplatform.googleapis.com/v1/projects/proj-x/locations/global/publishers/google/models/gemini-2.5-flash:generateContent',
  );
  expect((mock.calls.api[0].init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
});

it('usa o endpoint regional quando location não é global', async () => {
  const sa = await makeTestSa('kid-url-regional');
  const mock = makeFetchMock();
  const ai = new VertexGenAI({
    saKeyJson: sa.saJson,
    project: 'proj-x',
    location: 'us-central1',
    fetchImpl: mock.fetchImpl,
  });
  await ai.models.generateContent({ model: 'm', contents: 'oi' });
  expect(mock.calls.api[0].url).toBe(
    'https://us-central1-aiplatform.googleapis.com/v1/projects/proj-x/locations/us-central1/publishers/google/models/m:generateContent',
  );
});

it('mapeia config no formato do SDK para o corpo REST do Vertex', async () => {
  const sa = await makeTestSa('kid-map');
  const mock = makeFetchMock();
  const safetySettings = [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }];
  await client(sa, mock).models.generateContent({
    model: 'm',
    contents: 'pergunta',
    config: { temperature: 0.3, maxOutputTokens: 8192, safetySettings },
  });

  const body = JSON.parse(mock.calls.api[0].init.body as string);
  expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'pergunta' }] }]);
  expect(body.generationConfig).toEqual({ temperature: 0.3, maxOutputTokens: 8192 });
  expect(body.safetySettings).toEqual(safetySettings);
  expect(body.config).toBeUndefined();
});

it('propaga thinkingConfig quando presente na config', async () => {
  const sa = await makeTestSa('kid-thinking');
  const mock = makeFetchMock();
  await client(sa, mock).models.generateContent({
    model: 'gemini-thinking',
    contents: 'x',
    config: { thinkingConfig: { thinkingLevel: 'HIGH' } },
  });
  const body = JSON.parse(mock.calls.api[0].init.body as string);
  expect(body.generationConfig).toEqual({ thinkingConfig: { thinkingLevel: 'HIGH' } });
});

it('omite campos ausentes do config sem enviar chaves vazias', async () => {
  const sa = await makeTestSa('kid-map-min');
  const mock = makeFetchMock();
  await client(sa, mock).models.generateContent({ model: 'm', contents: 'x' });
  const body = JSON.parse(mock.calls.api[0].init.body as string);
  expect(body.generationConfig).toBeUndefined();
  expect(body.systemInstruction).toBeUndefined();
  expect(body.safetySettings).toBeUndefined();
});

it('expõe .text com as partes não-thought e usageMetadata intacto', async () => {
  const sa = await makeTestSa('kid-resp');
  const apiPayload = {
    candidates: [
      {
        content: { parts: [{ thought: true, text: 'raciocínio' }, { text: 'olá ' }, { text: 'mundo' }] },
        finishReason: 'STOP',
      },
    ],
    usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2, thoughtsTokenCount: 7 },
    modelVersion: 'm-001',
  };
  const mock = makeFetchMock({ apiPayload });
  const res = await client(sa, mock).models.generateContent({ model: 'm', contents: 'oi' });
  expect(res.text).toBe('olá mundo');
  expect(res.usageMetadata).toEqual(apiPayload.usageMetadata);
});

it('.text é vazio quando não há candidates', async () => {
  const sa = await makeTestSa('kid-resp-vazio');
  const mock = makeFetchMock({ apiPayload: { candidates: [] } });
  const res = await client(sa, mock).models.generateContent({ model: 'm', contents: 'oi' });
  expect(res.text).toBe('');
});

it('reusa o access token em chamadas subsequentes dentro da validade', async () => {
  const sa = await makeTestSa('kid-cache');
  const mock = makeFetchMock();
  const ai = client(sa, mock);
  await ai.models.generateContent({ model: 'm', contents: '1' });
  await ai.models.generateContent({ model: 'm', contents: '2' });
  await ai.models.countTokens({ model: 'm', contents: '3' });
  expect(mock.calls.token).toHaveLength(1);
  expect(mock.calls.api).toHaveLength(3);
});

it('reminta o token quando a validade (com margem) expira', async () => {
  const sa = await makeTestSa('kid-expiry');
  const mock = makeFetchMock();
  let nowMs = 1_700_000_000_000;
  const ai = client(sa, mock, { now: () => nowMs });
  await ai.models.countTokens({ model: 'm', contents: '1' });
  nowMs += (3600 - 240) * 1000; // dentro da margem de 300s → precisa remintar
  await ai.models.countTokens({ model: 'm', contents: '2' });
  expect(mock.calls.token).toHaveLength(2);
});

it('single-flight: chamadas concorrentes compartilham uma única mint de token', async () => {
  const sa = await makeTestSa('kid-flight');
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const mock = makeFetchMock({ tokenDelay: () => gate });
  const ai = client(sa, mock);
  const p1 = ai.models.countTokens({ model: 'm', contents: '1' });
  const p2 = ai.models.generateContent({ model: 'm', contents: '2' });
  release();
  await Promise.all([p1, p2]);
  expect(mock.calls.token).toHaveLength(1);
});

it('o cache é por identidade de chave (kid distinto minta separadamente)', async () => {
  const sa1 = await makeTestSa('kid-iso-1');
  const sa2 = await makeTestSa('kid-iso-2');
  const mock = makeFetchMock();
  await client(sa1, mock).models.countTokens({ model: 'm', contents: 'a' });
  await client(sa2, mock).models.countTokens({ model: 'm', contents: 'b' });
  expect(mock.calls.token).toHaveLength(2);
});

it('countTokens monta a URL própria e repassa o retorno', async () => {
  const sa = await makeTestSa('kid-count');
  const mock = makeFetchMock({ apiPayload: { totalTokens: 42 } });
  const res = await client(sa, mock).models.countTokens({ model: 'gemini-2.5-flash', contents: 'conte' });
  expect(mock.calls.api[0].url).toBe(
    'https://aiplatform.googleapis.com/v1/projects/proj-x/locations/global/publishers/google/models/gemini-2.5-flash:countTokens',
  );
  const body = JSON.parse(mock.calls.api[0].init.body as string);
  expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'conte' }] }]);
  expect(body.generationConfig).toBeUndefined();
  expect(res.totalTokens).toBe(42);
});

it('invoca o fetch global desacoplado do this da instância (regressão: Illegal invocation no workerd)', async () => {
  const sa = await makeTestSa('kid-global-fetch');
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  // O fetch do workerd de produção lança TypeError quando invocado com um
  // `this` que não é o escopo global — simulamos essa sensibilidade aqui.
  globalThis.fetch = function (this: unknown, url: string) {
    if (this !== undefined && this !== globalThis) {
      throw new TypeError('Illegal invocation: function called with incorrect `this` reference.');
    }
    urls.push(String(url));
    if (String(url).includes('oauth2.test.invalid')) {
      return Promise.resolve(jsonResponse(200, { access_token: 'tok-g', expires_in: 3600 }));
    }
    return Promise.resolve(jsonResponse(200, { totalTokens: 1 }));
  } as unknown as typeof fetch;
  try {
    const ai = new VertexGenAI({ saKeyJson: sa.saJson, project: 'proj-x', location: 'global' });
    const res = await ai.models.countTokens({ model: 'm', contents: 'x' });
    expect(res.totalTokens).toBe(1);
    expect(urls).toHaveLength(2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

it('erro do token endpoint vira Error com status e detalhe do OAuth', async () => {
  const sa = await makeTestSa('kid-err-token');
  const mock = makeFetchMock({
    tokenStatus: 400,
    tokenPayload: { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' },
  });
  await expect(client(sa, mock).models.countTokens({ model: 'm', contents: 'x' })).rejects.toThrow(
    /400.*invalid_grant.*Invalid JWT Signature/s,
  );
});

it('erro do Vertex vira Error com status e trecho do corpo', async () => {
  const sa = await makeTestSa('kid-err-api');
  const mock = makeFetchMock({ apiStatus: 429, apiPayload: { error: { code: 429, message: 'Resource exhausted' } } });
  await expect(client(sa, mock).models.generateContent({ model: 'm', contents: 'x' })).rejects.toThrow(
    /429.*Resource exhausted/s,
  );
});

it('credential JSON sem campo obrigatório falha nomeando o campo', async () => {
  const sa = await makeTestSa('kid-err-cred');
  const broken = JSON.stringify({ ...JSON.parse(sa.saJson), private_key: undefined });
  const mock = makeFetchMock();
  const ai = new VertexGenAI({ saKeyJson: broken, project: 'p', location: 'global', fetchImpl: mock.fetchImpl });
  await expect(ai.models.countTokens({ model: 'm', contents: 'x' })).rejects.toThrow(/private_key/);
});

it('credential JSON malformado falha com erro diagnóstico, não SyntaxError crua', async () => {
  const mock = makeFetchMock();
  const ai = new VertexGenAI({ saKeyJson: 'não-é-json', project: 'p', location: 'global', fetchImpl: mock.fetchImpl });
  await expect(ai.models.countTokens({ model: 'm', contents: 'x' })).rejects.toThrow(/VERTEX_SA_KEY.*JSON/s);
});
