/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Tipagem estrita de bindings do Cloudflare Worker (mainsite-motor).
 * Todos os módulos de rota importam este tipo via `Env`.
 *
 * Secret Store bindings retornam um objeto Fetcher com método `.get()`.
 * O middleware resolver em index.ts converte esses para strings antes
 * dos handlers executarem.
 */

/** Cloudflare Secret Store binding — valor acessado via `.get()` */
interface SecretStoreBinding {
  get(): Promise<string>;
}

/**
 * Raw bindings como recebidos do Cloudflare runtime.
 * Secrets do Secret Store são SecretStoreBinding (precisa `.get()`).
 */
export interface RawEnv {
  // --- D1 Database ---
  DB: D1Database;

  // --- R2 Bucket ---
  BUCKET: R2Bucket;

  // --- Workers AI ---
  AI: Ai;

  // --- Rate Limiting (native Cloudflare binding) ---
  RL_CHATBOT: RateLimit;
  RL_EMAIL: RateLimit;
  RL_COMMENTS: RateLimit;

  // --- Secrets & Tokens (Secret Store → .get()) ---
  CLOUDFLARE_PW: SecretStoreBinding;
  RESEND_API_KEY: SecretStoreBinding;

  // --- Vertex AI (Gemini Enterprise Agent Platform) ---
  // Service Account JSON completo (~2,4 KB) no Secret Store — o limite
  // atual de valor é 64 KiB por secret. VERTEX_PROJECT/VERTEX_LOCATION são
  // overrides opcionais; defaults em lib/genai.ts.
  VERTEX_SA_KEY: SecretStoreBinding;
  VERTEX_PROJECT?: string;
  VERTEX_LOCATION?: string;

  // --- Turnstile (Secret Store → .get()) ---
  TURNSTILE_SECRET_KEY: SecretStoreBinding;

  // --- GCP Natural Language API ---
  // Service Account JSON no Secret Store, como VERTEX_SA_KEY. Migrado do
  // secret nativo em 27/08/2026: a restrição de 1024 chars que motivou o
  // formato antigo está vencida — o limite atual é 64 KiB por secret.
  // A conta de serviço anterior, de um projeto pessoal, foi substituída por
  // uma do projeto institucional; o endereço dela não é versionado (AGENTS.md,
  // "Identificadores e credenciais em repositorio publico").
  GCP_NL_API_KEY: SecretStoreBinding;

  // --- Cloudflare Access (optional hardening for admin routes) ---
  CF_ACCESS_TEAM_DOMAIN?: SecretStoreBinding;
  CF_ACCESS_AUD?: SecretStoreBinding;
  ENFORCE_JWT_VALIDATION?: SecretStoreBinding;
}

/**
 * Env pós-middleware — todos os secrets já resolvidos para string.
 * Handlers usam esta interface via `c.env`.
 */
export interface Env {
  // --- D1 Database ---
  DB: D1Database;

  // --- R2 Bucket ---
  BUCKET: R2Bucket;

  // --- Workers AI ---
  AI: Ai;

  // --- Rate Limiting (native Cloudflare binding) ---
  RL_CHATBOT: RateLimit;
  RL_EMAIL: RateLimit;
  RL_COMMENTS: RateLimit;

  // --- Secrets & Tokens (resolved to string by middleware) ---
  CLOUDFLARE_PW: string;
  RESEND_API_KEY: string;

  // --- Vertex AI (resolved to string by middleware) ---
  VERTEX_SA_KEY: string;
  VERTEX_PROJECT?: string;
  VERTEX_LOCATION?: string;

  // --- Moderação (GCP NL API + Turnstile) ---
  GCP_NL_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;

  // --- Cloudflare Access (optional hardening for admin routes) ---
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ENFORCE_JWT_VALIDATION?: string;
}
