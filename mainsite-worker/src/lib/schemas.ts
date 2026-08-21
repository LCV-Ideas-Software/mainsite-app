/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Schemas Zod centralizados para validação de input nos endpoints públicos.
 * Uso: z.safeParse(await c.req.json()) nos handlers de rotas.
 */
import { z } from 'zod';

/** POST /api/contact */
export const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  message: z.string().min(1).max(5000),
  phone: z.string().max(30).optional(),
  turnstile_token: z.string().optional(),
});
export type ContactInput = z.infer<typeof ContactSchema>;

/** POST /api/comment (email ao admin) */
export const CommentEmailSchema = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().max(320).optional(),
  message: z.string().min(1).max(5000),
  post_title: z.string().max(300).optional(),
  turnstile_token: z.string().optional(),
});
export type CommentEmailInput = z.infer<typeof CommentEmailSchema>;

/** POST /api/ai/public/chat */
export const ChatInputSchema = z.object({
  message: z.string().min(1).max(4000),
  currentContext: z
    .object({
      title: z.string().max(500).optional(),
      content: z.string().optional(),
    })
    .nullish(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

/** POST /api/share/email */
export const ShareEmailSchema = z.object({
  post_id: z.union([z.string(), z.number()]),
  post_title: z.string().max(300),
  link: z.string().url(),
  target_email: z.string().email(),
  turnstile_token: z.string().min(1),
});
export type ShareEmailInput = z.infer<typeof ShareEmailSchema>;

/** POST /api/comments (comentário público com moderação) */
export const NewCommentSchema = z.object({
  post_id: z.number().int().positive(),
  parent_id: z.number().int().positive().nullable().optional(),
  author_name: z.string().max(100).optional(),
  author_email: z.string().email().max(255).optional(),
  content: z.string().min(1),
  turnstile_token: z.string().optional(),
  _hp: z.string().optional(),
});
export type NewCommentInput = z.infer<typeof NewCommentSchema>;

/** POST /api/ratings */
export const RatingsSchema = z.object({
  post_id: z.number().int().positive().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  reaction_type: z.string().optional(),
});
export type RatingsInput = z.infer<typeof RatingsSchema>;

/** POST /api/posts, PUT /api/posts/:id (admin) */
export const PostBodySchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  author: z.string().optional(),
});
export type PostBodyInput = z.infer<typeof PostBodySchema>;

/** PUT /api/posts/reorder (admin) */
export const PostReorderSchema = z.array(
  z.object({
    id: z.union([z.string(), z.number()]),
    display_order: z.number().int(),
  }),
);
export type PostReorderInput = z.infer<typeof PostReorderSchema>;

/** POST /api/shares (público) */
export const ShareLogSchema = z.object({
  post_id: z.union([z.string(), z.number()]).optional(),
  post_title: z.string().max(300).optional(),
  platform: z.string().max(50).optional(),
  target: z.string().max(320).optional(),
});
export type ShareLogInput = z.infer<typeof ShareLogSchema>;

/**
 * Secrets do Worker após resolução pelo middleware SecretStore.
 *
 * Camadas:
 * - "Sempre obrigatório": ausência indica deploy mal configurado; sinalização warn (não 503).
 * - "Feature-gated": runtime já é fail-closed (handlers retornam 503/410/etc. quando
 *   estes faltam). Por isso NÃO são `.optional()` — o schema reflete o contrato real
 *   exigido pelos handlers (`comments.ts`, `contact.ts` etc. dependem de
 *   `TURNSTILE_SECRET_KEY` e `GCP_NL_API_KEY`).
 */
export const EnvSecretsSchema = z.object({
  // Sempre obrigatório
  CLOUDFLARE_PW: z.string().min(1),
  // Credencial Vertex AI (SA JSON) — transporte atual da IA.
  VERTEX_SA_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  // Feature-gated (handlers retornam 503 quando faltam): require para alinhar schema/runtime
  GCP_NL_API_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
});

/**
 * Schemas dos payloads persistidos em `mainsite_settings` pelos PUTs de
 * settings (issue #410). São o gate de ESCRITA: o texto original é o que
 * persiste (extras sobrevivem — os leitores normalizam/descartam na
 * leitura), mas JSON inválido ou shape estruturalmente errado nunca mais
 * chega ao D1. Os leitores fail-safe existentes permanecem como estão.
 */
const SettingsToggleSchema = z.object({ enabled: z.boolean() });

export const RotationSettingsSchema = z.object({
  enabled: z.boolean(),
  // Minutos; o cron multiplica por 60_000 e o admin usa 60 como default.
  interval: z.number().int().min(1).max(10080),
  last_rotated_at: z.number().int().min(0),
});

export const RateLimitToggleSettingsSchema = z.object({
  chatbot: SettingsToggleSchema.optional(),
  email: SettingsToggleSchema.optional(),
  comments: SettingsToggleSchema.optional(),
  // Legado tolerado pelo leitor: root `enabled` vira fallback do chatbot.
  enabled: z.boolean().optional(),
});

const ThemePaletteSchema = z.object({
  bgColor: z.string().optional(),
  bgImage: z.string().optional(),
  fontColor: z.string().optional(),
  titleColor: z.string().optional(),
});

export const AppearanceSettingsSchema = z.object({
  allowAutoMode: z.boolean().optional(),
  light: ThemePaletteSchema.optional(),
  dark: ThemePaletteSchema.optional(),
  shared: z
    .object({
      fontSize: z.string().optional(),
      titleFontSize: z.string().optional(),
      fontFamily: z.string().optional(),
      bodyWeight: z.string().optional(),
      titleWeight: z.string().optional(),
      lineHeight: z.string().optional(),
      textAlign: z.string().optional(),
      textIndent: z.string().optional(),
      paragraphSpacing: z.string().optional(),
      contentMaxWidth: z.string().optional(),
      linkColor: z.string().optional(),
    })
    .optional(),
});

export const DisclaimersSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  // looseObject: itens carregam extras consumidos pelo frontend
  // (ex.: isDonationTrigger) que devem sobreviver ao gate.
  items: z
    .array(
      z.looseObject({
        id: z.string().min(1),
        title: z.string(),
        text: z.string(),
        buttonText: z.string(),
        enabled: z.boolean().optional(),
      }),
    )
    .optional(),
});
