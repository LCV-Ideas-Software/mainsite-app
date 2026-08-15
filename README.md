<p align="center">
  <img src=".github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas &amp; Software" width="520" />
</p>

# mainsite-app

[![status: stable](https://img.shields.io/badge/status-stable-brightgreen.svg)](#status)
[![Deploy](https://github.com/LCV-Ideas-Software/mainsite-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/LCV-Ideas-Software/mainsite-app/actions/workflows/deploy.yml)
[![Pages](https://github.com/LCV-Ideas-Software/mainsite-app/actions/workflows/pages.yml/badge.svg)](https://github.com/LCV-Ideas-Software/mainsite-app/actions/workflows/pages.yml)
[![CodeQL](https://github.com/LCV-Ideas-Software/mainsite-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/LCV-Ideas-Software/mainsite-app/actions/workflows/codeql.yml)
[![runtime: Cloudflare Pages + Workers](https://img.shields.io/badge/runtime-Cloudflare%20Pages%20%2B%20Workers-orange.svg)](https://workers.cloudflare.com/)
[![framework: React 19 + Vite 8](https://img.shields.io/badge/framework-React%2019%20%2B%20Vite%208-61dafb.svg)](https://react.dev/)
[![backend: Hono on Workers](https://img.shields.io/badge/backend-Hono%20on%20Workers-f97316.svg)](https://hono.dev/)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)

**Reflexos da Alma** — public personal blog + companion services. Two independent Cloudflare deploys served from this monorepo, both reading from the shared Cloudflare D1 database `bigdata_db`:

- **`mainsite-frontend`** — React 19 + Vite 8 single-page app on Cloudflare Pages, primary domain `example-blog.invalid` (+ secondary aliases). Public-facing site with reading experience, comments, ratings, AI chatbot, share-by-email, and accessibility-first design.
- **`mainsite-worker`** — Hono backend on Cloudflare Workers serving `/api/*` for the frontend. AI surfaces (Gemini models through Vertex AI), moderation (GCP Natural Language API + Turnstile), email relay (Resend), and R2 media.

**Status.** Stable. Current internal versions: **mainsite-frontend v03.23.05** and **mainsite-worker v02.20.01**. See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

The version history at a glance:

| Internal version                                                | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`mainsite-worker v02.20.01` + `mainsite-frontend v03.23.05`** | **Legacy AI Studio binding retired (worker only).** Drops the `GEMINI_API_KEY` binding, its two type declarations, the resolver `SECRET_KEYS` entry and the optional schema field — nothing had read the key since the Vertex migration. Also realigns `APP_VERSION`, which had stayed at `v02.19.05` while the sub-app changelog already recorded v02.20.00.                                                                                                      |
| **`mainsite-worker v02.20.00` + `mainsite-frontend v03.23.05`** | **Vertex AI migration (worker only).** AI transport moves from the AI Studio API key to Vertex AI with service-account OAuth (JWT RS256 via WebCrypto → OAuth2 access token), shifting AI spend from AI Studio prepay to Cloud Billing postpay. The public surface of `lib/genai.ts` is preserved, so no call site changed; prompts, D1 model selection, retries, safety settings and telemetry are untouched. Adds `src/lib/vertex.ts` and drops `@google/genai`. |
| **`mainsite-worker v02.19.05` + `mainsite-frontend v03.23.05`** | **Dependency security patch.** Hono 4.12.34 (GHSA-8j4g-w8fx-2239), `brace-expansion` 5.0.9 (GHSA-rgw5-rvv9-x895), `fast-uri` 4.1.2 (GHSA-7p8r-x3mc-p8w7), Wrangler 4.118.0, PostCSS 8.5.25 and the `miniflare → undici` override at 7.29.0.                                                                                                                                                                                                                        |
| **`mainsite-worker v02.19.04` + `mainsite-frontend v03.23.04`** | **Dependency security patch.** Resolves GHSA-3jxr-9vmj-r5cp in both sub-apps with major-compatible `brace-expansion` overrides and GHSA-j3f2-48v5-ccww in the worker with `protobufjs` 7.6.5; also ships the already-landed native Cloudflare rate-limit cleanup.                                                                                                                                                                                                  |
| **`mainsite-worker v02.19.03` + `mainsite-frontend v03.23.03`** | **4-gate quality directive compliance.** Added Biome checks to both sub-apps, aligned configs, reformatted code, and bumped APP_VERSION in both packages.                                                                                                                                                                                                                                                                                                          |
| **`mainsite-worker v02.19.02` + `mainsite-frontend v03.23.02`** | **Site sponsor card iteration.** `site/index.html` GitHub Sponsors iframe (caixa branca cross-origin) substituído por link card dark navy com ❤ pink + meta cyan + seta animada; card movido para DEPOIS dos botões (lcv.dev/sponsor primário, GitHub Sponsors alternativa). Companion ship Phase 3 (12 repos).                                                                                                                                                    |
| **`mainsite-worker v02.19.01` + `mainsite-frontend v03.23.01`** | **Site visual identity refresh + sponsor-page alignment (2026-05-09).** `site/index.html` (GitHub Pages) recebeu a identidade dark-first navy/cyan da org LCV e consolidou a entrada anterior de sponsor-page alignment: o site do projeto encaminha apoio para `https://www.lcv.dev/sponsor?project=mainsite-app`, sem carregar SDKs de pagamento nem coletar dados de cartão.                                                                                    |
| **`mainsite-worker v02.19.00` + `mainsite-frontend v03.23.00`** | **Donation/payment removal + dependency/workflow hygiene.** Removed public donation/payment UI, SumUp widget/routes/secrets/dependencies, PIX/payment CSP/PWA cache allowances, and the payment landing page; updated direct dependencies and expanded Dependabot coverage for the root package.                                                                                                                                                                   |
| **`mainsite-worker v02.18.00` + `mainsite-frontend v03.22.00`** | **Security + UX audit + TipTap parity.** Worker: magic-byte upload validation, sentiment timeout, prompt-injection envelope, cron handler bugfix. Frontend: Error Boundary, ESC handler in all modals (read-gate preserved on disclaimer), fetch timeout, localStorage validation, PostReader↔PostEditor parity (embedded hljs theme, responsive iframes, image max-width, `data-width` whitelist).                                                                |
| **`mainsite-worker v02.17.06` + `mainsite-frontend v03.21.08`** | **README organizational standardization.** Adopted the shared repository README opening pattern and introduced the top-level version-history table for the monorepo.                                                                                                                                                                                                                                                                                               |
| **`mainsite-frontend v03.21.06`**                               | **Typography parity fix.** Restored default text indentation for HTML paragraph rendering so saved PostEditor content matches the intended reading layout.                                                                                                                                                                                                                                                                                                         |
| **`mainsite-worker v02.17.05` + `mainsite-frontend v03.21.05`** | **Pages + Sponsors public surface.** Added the GitHub Pages project site, corrected the Sponsors custom URL, and modernized the Pages workflow.                                                                                                                                                                                                                                                                                                                    |
| **`mainsite-worker v02.17.04` + `mainsite-frontend v03.21.04`** | **Security and history cleanup.** Closed CodeQL issues, removed a leaked legacy Cloudflare token from Git history, and tightened sanitization paths.                                                                                                                                                                                                                                                                                                               |

## What it does

Public-facing artifact + edge-deployed APIs:

1. **Reading experience** — `PostReader` with smart polling (`useContentSync` + `ContentUpdateToast`) for live updates, JSON-LD + OG/Twitter Card SEO metadata, attribution-based clipboard handling (intentionally NOT a hostile copy-blocker — see [SECURITY.md](./SECURITY.md) ADR), reading-progress accessibility hooks.
2. **Comments + ratings** — Turnstile-gated public submission, GCP NL sentiment-aware moderation pipeline, threaded replies, idempotent rating accumulation.
3. **AI public chatbot (`/api/ai/public/chat`)** — Gemini-powered helper served through Vertex AI, with content-aware context grounded on published posts. Hard caps: per-IP rate limit + global hourly budget cap (default-on).
4. **Share-by-email + contact** — Turnstile-gated, Resend-relayed, canonical-link-validated, recipient-window-capped (5/recipient/24h).
5. **Theme system** — `/api/theme.css` same-origin, generated from D1 settings to keep CSP strict.
6. **R2 media + uploads** — `image/jpeg|png|gif|webp|avif|pdf` allowlisted with magic-byte sniffing, 10 MB cap, SVG explicitly blocked (legacy SVGs served sandboxed with `Content-Security-Policy: sandbox`).
7. **Pages Functions** — server-side rendering for deep links (HTMLRewriter-injected OG/JSON-LD), `/autor/:slug` SSR, sitemap + feed honoring publishing mode.

## Architecture

```
Browser
  ├──→ Cloudflare Pages: mainsite-frontend (React 19 + Vite 8)
  │      └─ public/_headers: CSP for Turnstile, analytics, YouTube and Cloudflare Insights
  │      └─ functions/[[path]].ts: SSR for /, /p/:id, /autor/:slug, /sitemap.xml, /feed.xml
  │      └─ /api/* → Service Binding → mainsite-worker
  │
  └──→ Cloudflare Worker: mainsite-worker (Hono)
        ├─ public surface: posts, comments, ratings, AI chat, contact, share-email,
        │  theme.css, content-fingerprint, uploads
        ├─ admin surface (CF-Access JWT or bearer): post CRUD, settings, moderation,
        │  share-email logs
        └──→ D1 (bigdata_db) + R2 (mainsite-media) + Workers AI + Vertex AI (Gemini models)
```

The shared D1 binding is declared directly in both `wrangler.json` files. Its UUID is an identifier, not a credential; Cloudflare API tokens and application secrets remain outside the repository.

## Deploy your own fork

You will need:

- A Cloudflare account ([free tier](https://www.cloudflare.com/plans/)) with Pages + Workers + D1 + R2 enabled.
- The Cloudflare CLI [`wrangler`](https://developers.cloudflare.com/workers/wrangler/).
- Node.js 24+.
- A Google Cloud project with Vertex AI enabled and a least-privilege service account whose JSON credential will be stored as `VERTEX_SA_KEY`.
- Resend API key (transactional email).
- Cloudflare Turnstile site key + secret (form anti-abuse).
- (Optional) GCP Service Account with Cloud Natural Language API access (comment moderation).

### 1. Clone + install

```bash
git clone https://github.com/LCV-Ideas-Software/mainsite-app.git
cd mainsite-app
cd mainsite-frontend && npm ci && cd ..
cd mainsite-worker && npm ci && cd ..
```

### 2. Create D1 database + R2 bucket

```bash
npx wrangler d1 create example_db
# wrangler outputs:
#   database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
npx wrangler r2 bucket create mainsite-media
```

### 3. Wire the D1 database into both `wrangler.json` files

Set `database_name` to the name created in step 2 (`example_db` in the example) and `database_id` to the UUID returned by Wrangler in both:

- `mainsite-frontend/wrangler.json` (Pages app)
- `mainsite-worker/wrangler.json` (Worker)

### 4. Configure Cloudflare Secrets Store secrets

Create or select your own Cloudflare Secrets Store, replace the repository-specific `store_id` values, and populate the bindings declared in `mainsite-worker/wrangler.json`. `VERTEX_SA_KEY` must contain the complete service-account JSON used to authenticate Vertex AI; `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY` hold their respective service credentials.

Set the non-secret `VERTEX_PROJECT` Wrangler variable to your Google Cloud project ID; set `VERTEX_LOCATION` as well if you are not using the default `global` location. The worker does not infer either value from `VERTEX_SA_KEY`.

`GCP_NL_API_KEY` is separate from Vertex AI and remains a native Worker secret for the Natural Language moderation path:

```bash
npx wrangler secret put GCP_NL_API_KEY --config mainsite-worker/wrangler.json
```

### 5. Deploy

```bash
cd mainsite-worker
npm run build
npx wrangler deploy
cd ..

cd mainsite-frontend
npm run build
npx wrangler pages deploy dist --project-name=mainsite-frontend
cd ..
```

## CI deploy (this repo)

This repo's [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main`:

1. `npm ci` + `npm audit --audit-level=high` for both sub-apps.
2. `lint`, Biome and tests for both, plus the frontend build.
3. The official Cloudflare Wrangler Action deploys the Worker and the Pages frontend with the versioned D1 binding.

This web app uses its internal `APP_VERSION` values. This migration retires publication of GitHub Releases and version tags; legacy objects are removed only after the release workflow is absent from `main`.

## Repository conventions

- **License**: [AGPL-3.0-or-later](./LICENSE). Network-service trigger applies: running a modified fork as a public service obligates you to publish modifications.
- **Notices**: see [NOTICE](./NOTICE) and [THIRDPARTY](./THIRDPARTY.md).
- **Security disclosure**: see [SECURITY.md](./SECURITY.md).
- **Code of conduct**: see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md).
- **Contributing**: see [CONTRIBUTING.md](./CONTRIBUTING.md).
- **Sponsorship**: see the repo's `Sponsor` button or [central sponsor page](https://www.lcv.dev/sponsor).
- **Action pinning**: all GitHub Actions are pinned by full SHA per supply-chain hardening baseline.
- **Code owners**: [.github/CODEOWNERS](.github/CODEOWNERS).

## Links

- Site: [https://mainsite-app.lcv.dev](https://mainsite-app.lcv.dev)
- GitHub: [https://github.com/LCV-Ideas-Software/mainsite-app](https://github.com/LCV-Ideas-Software/mainsite-app)
- Sponsors: [https://github.com/sponsors/LCV-Ideas-Software](https://github.com/sponsors/LCV-Ideas-Software)

## License

AGPL-3.0-or-later. See [LICENSE](./LICENSE), [NOTICE](./NOTICE), and [THIRDPARTY](./THIRDPARTY.md).

---

<p align="center"><span style="font-size: 1.5em;"><strong>Copyright © 2026 LCV Ideas &amp; Software</strong></span><br><sub>LEONARDO CARDOZO VARGAS TECNOLOGIA DA INFORMACAO LTDA<br>Rua Pais Leme, 215 Conj 1713 - Pinheiros<br>São Paulo - SP - CEP 05424-150<br>CNPJ: 66.584.678/0001-77 - IM: 3039854</sub></p>
