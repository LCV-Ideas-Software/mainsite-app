# Changelog — MainSite App

## [Unreleased]
### Corrigido — worker / rate limit
- **`/api/ai/public/chat`** deixou de aplicar o cap global D1 redundante (`chat-public-global` / `mainsite_rate_limit`) que retornava 429 antes da chamada ao Gemini quando a tabela auxiliar inexistia ou falhava.
- **`src/lib/rate-limit.ts`** agora normaliza apenas toggles administrativos (`chatbot`, `email`, `comments`); os limites efetivos permanecem nos bindings nativos `ratelimits` do Cloudflare Worker.

## [v03.23.02 / v02.19.02] - 2026-05-09
### Alterado
- **`site/index.html`** — iframe `github.com/sponsors/.../card` (caixa branca cross-origin) substituído por link card dark navy com ❤ pink + meta cyan + seta animada; card movido para DEPOIS dos botões (lcv.dev/sponsor primário, GitHub Sponsors alternativa). Companion ship Phase 3 (12 repos). APP_VERSION bumpada em ambos frontend e worker por consistência multi-repo, mas o reskin afeta apenas a página GitHub Pages.

## [v03.23.01 / v02.19.01] - 2026-05-09
### Alterado
- **`site/index.html`** — `<style>` block reskinneado pra nova identidade visual dark-first navy/cyan da org LCV (paleta `#050b18`/`#38bdf8`/`#34d399`, gradientes radiais, glow shadows, gradient text no h1). Coordinated companion ship Phase 2 com `calculadora-app` v04.01.17, `oraculo-financeiro` v01.10.04, `astrologo-app` v02.17.23, `admin-app` v02.01.01, `maestro-app` v0.5.17, `mtasts-motor` v02.00.10. Companion à Phase 1 (cross-review-v1 1.12.9, cross-review-v2 v02.18.07, deepseek-cli 0.3.1, grok-cli 1.6.2, sponsor-motor APP v01.02.02, `.github-org/site`). APP_VERSION bumpada em ambos `mainsite-frontend/src/App.tsx` (v03.23.00 → v03.23.01) e `mainsite-worker/src/index.ts` (v02.19.00 → v02.19.01) por consistência multi-repo, embora o reskin afete apenas a página GitHub Pages do repo. Sem mudança no Cloudflare Pages frontend ou no Worker runtime.
- Entrada [Unreleased] anterior (sponsor page alignment) consolidada com o novo reskin — a página continua alinhada ao padrão das demais e agora usa a nova identidade dark-first.

## [mainsite-worker v02.19.00 + mainsite-frontend v03.23.00] - 2026-05-06
### BREAKING / Removido — doações, pagamentos, SumUp e PIX
**Worker (`mainsite-worker`)**
- Removidas as rotas `/api/sumup/*` e toda a superfície pública de checkout/pagamento SumUp. Não há consumidores externos documentados; chamadas antigas passam a não ter endpoint operacional neste app.
- Removidos helpers financeiros, schemas de checkout, `askForDonation`, prompt de doação, bindings/secrets de SumUp/PIX e dependência `@sumup/sdk`.

**Frontend (`mainsite-frontend`)**
- Removidos `DonationModal`, `SumUpCardWidget`, testes, botão "Apoiar" do `PostReader`, gatilho de doação do `ChatWidget` e retomada por `checkout_id`.
- `DisclaimerModal` deixou de tratar `isDonationTrigger`; disclaimers públicos mantêm somente o read-gate editorial.
- CSP em `public/_headers` e cache Workbox deixaram de permitir/nominar gateways SumUp/OPPWA/bandeiras/3DS; manteve Turnstile, analytics, YouTube e Cloudflare Insights.
- `site/index.html` deixou de ser landing de pagamento e passou a ser página neutra do projeto.
### Alterado — dependências, workflows e Dependabot
- Dependências atualizadas para as versões correntes verificadas em 2026-05-06, incluindo React 19.2.6, Hono 4.12.18, Wrangler 4.88.0, Workers Types 4.20260506.1, Google GenAI 1.52.0, Zod 4.4.3, vite-plugin-pwa 1.3.0 e lint-staged 17.0.2.
- `deploy.yml` deixou de exportar `VITE_SUMUP_PUBLIC_API_KEY`.
- Dependabot agora cobre `github-actions`, `/`, `/mainsite-frontend` e `/mainsite-worker`; actions SHA-pinned já estavam nos releases mais recentes.
### Validação
- `npm outdated --long` sem pendências em `/`, `mainsite-frontend` e `mainsite-worker`.
- `npm audit --audit-level=high` sem vulnerabilidades.
- Frontend: `npm run lint`; `npm test`; `npm run build`.
- Worker: `npm run lint`; `npm test`; `npx tsc --noEmit`.
- Root/site: `npm run format:public:check`.
- YAML dos workflows/dependabot parseado via `js-yaml`; `git diff --check`.
### Versões
- mainsite-frontend APP v03.22.00 → APP v03.23.00
- mainsite-worker APP v02.18.00 → APP v02.19.00

## [mainsite-worker v02.18.00 + mainsite-frontend v03.22.00] - 2026-05-01
### Adicionado — auditoria de segurança + UX + paridade TipTap (worker + frontend)
**Worker (`mainsite-worker`)**
- Idempotência + ownership em checkouts SumUp via nova tabela `mainsite_sumup_checkouts` (PK `checkout_id`, UNIQUE `idempotency_key`, `caller_hash` 24h ownership window). Caller diferente em `/status` recebe `PENDING`, não `403`.
- Validação magic-byte (JPG/PNG/GIF/WebP/AVIF/PDF) em uploads antes de `BUCKET.put`.
- Sentiment com timeout (2s) via `Promise.race`.
- Honeypot trigger logado com hash IP/UA estruturado.
- `sanitizePlainText` parser-aware substitui regex strip em comentários (preserva `x < y`).
- Cron handler bugfix (`_ctx` → `ctx`) — restaura `bumpContentVersion`.
- Prompt-injection hardening na rota AI: envelope XML `<user_context_title>` / `<user_context_body>` com escape.
- Fees division-by-zero guard.

**Frontend (`mainsite-frontend`)**
- Error Boundary class component em `main.tsx` ao redor de `QueryClientProvider+App`.
- `useEscapeKey` hook em ContactModal/CommentModal/DonationModal/DisclaimerModal (read-gate preservado no DisclaimerModal via `canClose` lifted ao parent).
- `fetchWithTimeout` com `AbortController` composável (default 8s).
- **PostReader ↔ PostEditor (TipTap) paridade**: tema hljs (github-dark/light) embutido em `PostReader.css` para tokens `<span class="hljs-*">` de `CodeBlockLowlight` (sem dependência runtime); iframes responsivos (`aspect-ratio: 16/9`); `<img>` com `max-width: 100%`; `data-width` whitelisted em `DOMPurify.ADD_ATTR`.
- Validação de `localStorage.themePref` contra union `'light' | 'dark' | 'auto'`.

### Diferido (com rationale)
- iframe-3DS no DonationModal — requer testes em sandbox SumUp e fallback robusto.
- Tightening de `style` em DOMPurify — regrediria inline styles do TipTap em conteúdo já publicado.
- Worker settings Zod schema — refactor amplo, baixo risco residual (admin autenticado).

### Validação
- Worker: lint clean; vitest 8 arquivos / 20 testes.
- Frontend: lint clean; vitest 6 arquivos / 27 testes; build 402 KiB precache, 1812 modules, 1.25s.

## [mainsite-worker v02.17.06 + mainsite-frontend v03.21.08] - 2026-04-30
### Alterado — padronização organizacional do README
- `README.md` passou a seguir o novo padrão organizacional de abertura: logo harmonizado, bloco curto de status e tabela `The version history at a glance` no topo.

## [mainsite-frontend v03.21.06] - 2026-04-26
### Corrigido — text-indent ausente em `.html-content p`
- **`src/components/PostReader.css:189-194`** (`.post-reader .html-content p`): adicionado `text-indent: var(--site-text-indent)` para que parágrafos de HTML (vindos do PostEditor) recebam identação automática mesmo quando o HTML salvo não tem `style="text-indent: …rem"` inline. Antes só `.p-content` (legacy plain-text) tinha esse estilo, então AboutPage e qualquer post com `<p>` "nu" renderizava sem identação. Inline styles continuam vencendo (posts antigos com `text-indent: 1.5rem` inline preservam o valor).
- Pareado com `admin-app` v01.99.04 que muda o default da extensão TextIndent do PostEditor de `0` para `1.5` (paragraph) — toda nova gravação sai com inline `text-indent: 1.5rem`. Conteúdo de `mainsite_about` em D1 backfillado para o mesmo valor.

## [mainsite-worker v02.17.05 + mainsite-frontend v03.21.05] - 2026-04-26
### Adicionado
- **GitHub Pages site** (PIX donation landing) com workflow `pages.yml` no padrão moderno (artifact deployment via `configure-pages` + `upload-pages-artifact` + `deploy-pages`, todos SHA-pinned).
### Alterado
- **`.github/workflows/pages.yml`** — `actions/configure-pages@v6.0.0` passou a declarar `with: enablement: true` para idempotência em forks/clones que ainda não tenham GitHub Pages habilitado (corrige `Get Pages site failed... HTTP 404` em primeiro run).
- **`FUNDING.yml`** — corrigida `custom URL` para apontar a este repo (não cross-review-mcp).
### Validação
- Trilateral cross-review session `08bc6b9a-f3f5-434d-8276-2b21f562a843` (caller + Codex + Gemini) **READY**: paridade confirmada nos 9 repos públicos do workspace em security baseline, repo features, workflow perms, branch rulesets, Pages deployment, CodeQL Default Setup, 0 alertas abertos.

## [mainsite-worker v02.17.04 + mainsite-frontend v03.21.04] - 2026-04-26
### Segurança — leak post-public-flip + Code Scanning alerts (CodeQL)
- **CRÍTICO — token Cloudflare User API vazado**: history scrub via `git-filter-repo` removeu o token (`cfut_*`) que estava em `mainsite-worker/test-genai.ts` (commit `79ea8e22` legado, arquivo já deletado de HEAD desde 2026-04-06). Cloudflare auto-revogou o token via partner notification do GitHub Secret Scanning. Alerta GH #3 marcado como `resolved/revoked`.
- **`js/incomplete-sanitization` × 2**: `mainsite-frontend/src/components/PostReader.tsx:74` e `mainsite-frontend/src/components/AboutPage.tsx:30` passaram a usar `escapeRegExp` (`[.*+?^${}()|[\]\\]`) para escapar todos os caracteres especiais ao construir o pattern regex de domínios internos. CodeQL false-positive (regex pattern construction, não output sanitization), mas o escape mais comprehensive elimina o aviso.
- **`js/incomplete-multi-character-sanitization`**: `mainsite-worker/src/routes/comments.ts:300` agora faz loop até estabilizar no strip de tags HTML para resistir a padrões aninhados.

## [mainsite-worker v02.17.03 + mainsite-frontend v03.21.03] - 2026-04-26
### Adicionado — Phase 3 sweep (flip readiness, puramente aditivo)
- **`CONTRIBUTING.md`**: guia para issues + PRs cobrindo gates locais por sub-app (mainsite-frontend + mainsite-worker), wrangler dry-run, action pinning, versioning, regra de `public/_headers` intocável.
- **`CODE_OF_CONDUCT.md`**: Contributor Covenant 2.1 com canal `alert@lcvmail.com`.
- **`.github/CODEOWNERS`**: `* @lcv-leo` como owner default.
- **`.npmignore`**: baseline de ignore para tarball npm (segredo/secrets store/.wrangler/AI memory/internal docs como `NEXTJS_MIGRATION_PLAN.md`).
- **`THIRDPARTY.md`**: inventário completo de dependências mainsite-frontend + mainsite-worker com licenças e origens.
### Corrigido — pre-existing lint warnings em `mainsite-worker/src/index.ts`
- Linha 225 `scheduled(event, env, ctx)` parâmetros não usados → `_event`/`_ctx` para silenciar warning.
- Linha 254 `posts.shift()!` non-null assertion → guarded `if (!topPost) return;`.

## [mainsite-worker v02.17.02 + mainsite-frontend v03.21.02] - 2026-04-26
### Phase 1 sweep — audit residuals
- **lcv-rio → lcv-leo (audit MEDIUM #14)**: 4 arquivos no `mainsite-frontend` (`index.html`, `functions/[[path]].ts`, `public/llms.txt`, `src/components/PostReader.tsx`) atualizados para apontar à org canônica `lcv-leo` em GitHub e LinkedIn (JSON-LD `sameAs` arrays + llms.txt + meta tags). ComplianceBanner já estava correto.
- **mainsite-worker dead code purge (audit NIT)**: `src/routes/misc.ts` (router Hono vazio mountado sem rotas) deletado; import e mount removidos de `src/index.ts`.
- **mainsite-worker type tightening (audit NIT)**: `src/env.ts` `AI: any` → `AI: Ai` (tipo nativo de `@cloudflare/workers-types`).
- **mainsite-worker GCP_NL_API_KEY type-drift fix (audit MEDIUM #44)**: tipo passa de `SecretStoreBinding` para `string` em `RawEnv` com comentário explicativo de que é native Worker secret (>1024 chars JSON SA não cabe em Secrets Store). Resolver permanece duck-typed via `typeof binding.get === 'function'`.
- **mainsite-worker EnvSecretsSchema (audit MEDIUM #20)**: `TURNSTILE_SECRET_KEY` e `GCP_NL_API_KEY` removidos de `.optional()`; agora exigidos pelo schema para alinhar com o contrato runtime fail-closed dos handlers (`comments.ts`, `contact.ts` retornam 503 quando faltam). PIX permanece opcional (realmente).

## [docs/SECURITY] - 2026-04-25
### Documentação
- **`SECURITY.md`**: nova seção "Architectural Decision — Content Protection: Attribution over Blocking" formaliza a decisão (CHANGELOG entries v03.13.x e arredores) de remover camadas hostis de bloqueio (contextmenu/keydown/PrintScreen/DevTools/`user-select:none`) em favor de atribuição automática no clipboard. Documentação preventiva contra reintrodução acidental e contra falsos positivos de auditoria. Aborda item NIT #7 da auditoria 2026-04-25.

## [mainsite-worker v02.17.01 + mainsite-frontend v03.21.01] - 2026-04-25
### Public-flip prep (Auditoria Fase 0)
- **D1 nil-UUID + GHA secret-injection**: `mainsite-worker/wrangler.json` e `mainsite-frontend/wrangler.json` substituem o `database_id` real por placeholder nil-UUID (`00000000-0000-0000-0000-000000000000`); o ID real é injetado em deploy via `D1_DATABASE_ID` (GitHub Secret) com substituição `jq` em ambos os configs no único job `deploy`. Replica padrão do oraculo-financeiro v01.10.01. Achado BLOCKING #4 da auditoria 2026-04-25.

## [mainsite-worker v02.17.00] - 2026-04-25
### Hardening (Auditoria trilateral cross-review — Fase 0)
- **`src/lib/auth.ts` — `getAdminEmail` cache com TTL e invalidador**: o cache module-scope que retornava o e-mail do admin sem nunca expirar foi substituído por TTL de 60 s; export de `invalidateAdminEmailCache()` permite invalidação explícita pelos chamadores que mutam `mainsite_settings.mainsite/admin_email`. Achado BLOCKING #3 da auditoria 2026-04-25.
- **`src/routes/contact.ts` — guards de `RESEND_API_KEY` ausente**: `/api/contact` e `/api/comment` retornam `503` com log estruturado em vez de emitir `Bearer undefined` ao Resend caso o resolver do Secrets Store falhe transitoriamente. Achado HIGH #5.
- **`src/routes/ai.ts` + `src/lib/rate-limit.ts` — cap absoluto global em `/api/ai/public/chat`**: nova rota `chat-public-global` no `DEFAULT_RATE_LIMIT` com 500 req/h (default-on, configurável via `mainsite_settings/mainsite/ratelimit`). Independente do toggle per-IP — protege contra botnets ciclando IPs. Retorna `429` quando excedido. Achado HIGH #6.
### Validação
- `npm run lint`.
- `npm test`.
- `npm run build`.

## [Auditoria de Segurança Coordenada] - 2026-04-25
### Segurança
- `mainsite-frontend` passou a usar helpers de publicação nas Pages Functions para impedir que sitemap, feed, páginas de autor e deep links exponham posts ocultos, não publicados ou conteúdo em modo `hidden`.
- `mainsite-worker` bloqueia novos uploads SVG e aplica CSP sandbox + `nosniff` em SVGs legados servidos por R2.
- CSP pública teve `connect-src`, `frame-src` e `form-action` restringidos a hosts explícitos; HTML público passa a sair sem headers CORS permissivos.
- CORS do worker agora exige origens HTTPS; `mainsite-worker` e `admin-motor` usam comparação constante portável para bearer tokens.
- `VITE_API_SECRET` saiu do ambiente de deploy do frontend; headers `Cache-Control` próprios foram removidos das rotas dos apps, preservando gerenciamento nativo da Cloudflare.
### Alterado
- Dependências de `mainsite-frontend` e `mainsite-worker` atualizadas; `WRANGLER_VERSION: "latest"` preservado no workflow por requisito operacional.
### Validação
- `mainsite-frontend`: `npm run lint`, `npm test`, `npm run build`.
- `mainsite-worker`: `npm run lint`, `npm test`, `npx --no-install wrangler deploy --dry-run`.
- `npm audit --audit-level=moderate` e `npm outdated --json` limpos nos dois pacotes.
- Cross-review MCP sessão `74c77006-3948-4b53-91cc-efe9f2c084c8`: Claude e Gemini retornaram `READY` para o pacote técnico.

## [Sobre Este Site — reversão e acabamento visual] - 2026-04-24
### Alterado
- `admin-app`: desmarcar "Sobre Este Site" no editor institucional agora restaura o conteúdo como post comum e limpa `mainsite_about`.
- `mainsite-frontend`: link "Sobre Este Site" no `ArchiveMenu` foi promovido de link hiperdiscreto para pill secundária com ícone e estados de hover/focus.
### Validação
- `admin-app`: `npm run test:admin-motor -- about.test.ts`, `npm run lint`, `npm run build`.
- `mainsite-frontend`: `npm test -- AboutPage.test.tsx`, `npm run lint`, `npm run build`.

## [Sobre Este Site] - 2026-04-24
### Adicionado
- Implantação coordenada do conteúdo institucional "Sobre Este Site" em `admin-app`, `mainsite-worker` e `mainsite-frontend`.
- O conteúdo passa a viver em `mainsite_about`, editado pelos mesmos mecanismos do post editor, exposto publicamente por `/api/about` e renderizado em `/sobre-este-site`.
### Validação
- `admin-app`: `npm run test:admin-motor`, `npm run lint`, `npm run build`.
- `mainsite-worker`: `npm test`, `npm run lint`, `npx tsc --noEmit`.
- `mainsite-frontend`: `npm test`, `npm run lint`, `npm run build`.

## [Security Publication Hardening] - 2026-04-23
### Segurança
- Memórias e contexto de agentes passaram a ser locais apenas: `.ai/`, `.aiexclude`, `.copilotignore` e `.github/copilot-instructions.md` foram adicionados ao ignore e removidos do índice Git com `git rm --cached`, preservando os arquivos no disco local.
- Regras de publicação foram endurecidas para impedir envio de `.env*`, `.dev.vars*`, `.wrangler/`, `.tmp/`, logs, bancos locais e artefatos de teste para GitHub/npm.
- `mainsite-worker` passou a declarar `"private": true` no `package.json`.
### Validação
- `git ls-files` confirmou ausência de memórias/artefatos locais rastreados; `npm pack --dry-run --json --ignore-scripts` não incluiu arquivos proibidos.
