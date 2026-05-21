/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Runtime toggles for Cloudflare native rate limiting.
 * Enforcement thresholds live in wrangler.json `ratelimits` bindings.
 */
export interface RateLimitToggleConfig {
  chatbot: { enabled: boolean };
  email: { enabled: boolean };
  comments: { enabled: boolean };
}

export const DEFAULT_RATE_LIMIT_TOGGLE: RateLimitToggleConfig = {
  chatbot: { enabled: false },
  email: { enabled: false },
  comments: { enabled: true },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readEnabled = (source: Record<string, unknown>, key: keyof RateLimitToggleConfig, fallback: boolean): boolean => {
  const section = source[key];
  if (isRecord(section) && typeof section.enabled === 'boolean') {
    return section.enabled;
  }
  return fallback;
};

/**
 * Normaliza apenas os toggles administrativos. Valores legados como
 * maxRequests/windowMinutes sao ignorados porque o limite efetivo e nativo
 * da Cloudflare, declarado em wrangler.json.
 */
export const normalizeRateLimitToggleConfig = (config: unknown): RateLimitToggleConfig => {
  const source = isRecord(config) ? config : {};
  const legacyRootEnabled = typeof source.enabled === 'boolean' ? source.enabled : undefined;

  return {
    chatbot: {
      enabled: readEnabled(source, 'chatbot', legacyRootEnabled ?? DEFAULT_RATE_LIMIT_TOGGLE.chatbot.enabled),
    },
    email: { enabled: readEnabled(source, 'email', DEFAULT_RATE_LIMIT_TOGGLE.email.enabled) },
    comments: { enabled: readEnabled(source, 'comments', DEFAULT_RATE_LIMIT_TOGGLE.comments.enabled) },
  };
};
