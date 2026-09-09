# Third-Party Components

This inventory covers every direct runtime, optional, peer, and development dependency
declared by `mainsite-frontend` and `mainsite-worker`, identified by name, license and source:
the SPDX expression published by the package and the upstream repository it declares (with the
directory for monorepo packages). Versions, ranges and immutable resolutions live in the two
`package.json` files and their committed `package-lock.json`, where Dependabot updates them (the
`Deploy` workflow repeats the Wrangler version in its `wranglerVersion` input, bumped by hand);
the full transitive trees remain recorded in those lockfiles and in GitHub's dependency graph,
which provides the SBOM on request, rather than being duplicated here.

The repository itself remains licensed under `AGPL-3.0-or-later`. Third-party packages
remain subject to their own terms and are not modified or vendored. The static
template asset documented below is copied unchanged and retains its upstream notice.

The frontend build also publishes the bundled dependencies' full license texts at
`/legal/DEPENDENCY-LICENSES.md`, using [Vite's native license output](https://vite.dev/config/build-options#build-license).
The legal page links to that build-specific report. Workbox is bundled separately by
`generateSW`; `/legal/WORKBOX-LICENSE.txt` preserves the upstream MIT text shared by the
Workbox 7.4.1 runtime packages, copied unchanged through Vite's public directory. Review
that notice against the upstream package license when upgrading Workbox.

## Copied static asset: create-vite icons

`mainsite-frontend/public/icons.svg` is copied unchanged from the official
[create-vite React TypeScript template](https://github.com/vitejs/vite/blob/b565af6f1123a62b3058253b2147574b8515e89f/packages/create-vite/template-react-ts/public/icons.svg)
at Vite `v8.0.0`, commit `b565af6f1123a62b3058253b2147574b8515e89f`.
Its SHA-256 is `b45fa506195cfcdef406ba9f0c77b36ddc1a7c224040926ec70abc2fdea7b93a`.
Vite copies this public asset to `/icons.svg` even though the current application
does not reference it. It is not a bundled module and therefore has no entry in
`/legal/DEPENDENCY-LICENSES.md`.

The following notice reproduces the [upstream MIT license](https://github.com/vitejs/vite/blob/b565af6f1123a62b3058253b2147574b8515e89f/LICENSE).
It applies to this copied asset, not to the whole application, which remains
`AGPL-3.0-or-later`. It does not grant rights to the third parties' trademarks.

```text
MIT License

Copyright (c) 2019-present, VoidZero Inc. and Vite contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

| Pacote            | Componente                       | Relação     | Licença                 | Fonte                                                                                 |
| ----------------- | -------------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------------------- |
| mainsite-frontend | `@biomejs/biome`                 | development | MIT OR Apache-2.0       | https://github.com/biomejs/biome (`packages/@biomejs/biome`)                          |
| mainsite-frontend | `@cloudflare/workers-types`      | runtime     | MIT OR Apache-2.0       | https://github.com/cloudflare/workerd                                                 |
| mainsite-frontend | `@eslint/js`                     | development | MIT                     | https://github.com/eslint/eslint (`packages/js`)                                      |
| mainsite-frontend | `@playwright/test`               | development | Apache-2.0              | https://github.com/microsoft/playwright                                               |
| mainsite-frontend | `@tanstack/react-query`          | runtime     | MIT                     | https://github.com/TanStack/query (`packages/react-query`)                            |
| mainsite-frontend | `@tanstack/react-query-devtools` | development | MIT                     | https://github.com/TanStack/query (`packages/react-query-devtools`)                   |
| mainsite-frontend | `@testing-library/dom`           | development | MIT                     | https://github.com/testing-library/dom-testing-library                                |
| mainsite-frontend | `@testing-library/jest-dom`      | development | MIT                     | https://github.com/testing-library/jest-dom                                           |
| mainsite-frontend | `@testing-library/react`         | development | MIT                     | https://github.com/testing-library/react-testing-library                              |
| mainsite-frontend | `@types/node`                    | development | MIT                     | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/node`)                     |
| mainsite-frontend | `@types/react`                   | development | MIT                     | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/react`)                    |
| mainsite-frontend | `@types/react-dom`               | development | MIT                     | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/react-dom`)                |
| mainsite-frontend | `@vitejs/plugin-react`           | development | MIT                     | https://github.com/vitejs/vite-plugin-react (`packages/plugin-react`)                 |
| mainsite-frontend | `@vitest/coverage-v8`            | development | MIT                     | https://github.com/vitest-dev/vitest (`packages/coverage-v8`)                         |
| mainsite-frontend | `@vitest/ui`                     | development | MIT                     | https://github.com/vitest-dev/vitest (`packages/ui`)                                  |
| mainsite-frontend | `dompurify`                      | runtime     | (MPL-2.0 OR Apache-2.0) | https://github.com/cure53/DOMPurify                                                   |
| mainsite-frontend | `eslint`                         | development | MIT                     | https://github.com/eslint/eslint                                                      |
| mainsite-frontend | `eslint-config-prettier`         | development | MIT                     | https://github.com/prettier/eslint-config-prettier                                    |
| mainsite-frontend | `eslint-plugin-react-hooks`      | development | MIT                     | https://github.com/facebook/react (`packages/eslint-plugin-react-hooks`)              |
| mainsite-frontend | `eslint-plugin-react-refresh`    | development | MIT                     | github:ArnaudBarre/eslint-plugin-react-refresh                                        |
| mainsite-frontend | `globals`                        | development | MIT                     | https://github.com/sindresorhus/globals                                               |
| mainsite-frontend | `husky`                          | development | MIT                     | https://github.com/typicode/husky                                                     |
| mainsite-frontend | `jsdom`                          | development | MIT                     | https://github.com/jsdom/jsdom                                                        |
| mainsite-frontend | `knip`                           | development | ISC                     | https://github.com/webpro-nl/knip (`packages/knip`)                                   |
| mainsite-frontend | `lint-staged`                    | development | MIT                     | https://github.com/lint-staged/lint-staged                                            |
| mainsite-frontend | `lucide-react`                   | runtime     | ISC                     | https://github.com/lucide-icons/lucide (`packages/lucide-react`)                      |
| mainsite-frontend | `react`                          | runtime     | MIT                     | https://github.com/react/react (`packages/react`)                                     |
| mainsite-frontend | `react-dom`                      | runtime     | MIT                     | https://github.com/react/react (`packages/react-dom`)                                 |
| mainsite-frontend | `rollup-plugin-visualizer`       | development | MIT                     | https://github.com/btd/rollup-plugin-visualizer                                       |
| mainsite-frontend | `typescript`                     | development | Apache-2.0              | https://github.com/microsoft/TypeScript                                               |
| mainsite-frontend | `typescript-eslint`              | development | MIT                     | https://github.com/typescript-eslint/typescript-eslint (`packages/typescript-eslint`) |
| mainsite-frontend | `vite`                           | development | MIT                     | https://github.com/vitejs/vite (`packages/vite`)                                      |
| mainsite-frontend | `vite-plugin-pwa`                | development | MIT                     | https://github.com/vite-pwa/vite-plugin-pwa                                           |
| mainsite-frontend | `vitest`                         | development | MIT                     | https://github.com/vitest-dev/vitest (`packages/vitest`)                              |
| mainsite-frontend | `wrangler`                       | development | MIT OR Apache-2.0       | https://github.com/cloudflare/workers-sdk (`packages/wrangler`)                       |
| mainsite-worker   | `@biomejs/biome`                 | development | MIT OR Apache-2.0       | https://github.com/biomejs/biome (`packages/@biomejs/biome`)                          |
| mainsite-worker   | `@cloudflare/workers-types`      | development | MIT OR Apache-2.0       | https://github.com/cloudflare/workerd                                                 |
| mainsite-worker   | `@eslint/js`                     | development | MIT                     | https://github.com/eslint/eslint (`packages/js`)                                      |
| mainsite-worker   | `@types/sanitize-html`           | runtime     | MIT                     | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/sanitize-html`)            |
| mainsite-worker   | `@vitest/ui`                     | development | MIT                     | https://github.com/vitest-dev/vitest (`packages/ui`)                                  |
| mainsite-worker   | `eslint`                         | development | MIT                     | https://github.com/eslint/eslint                                                      |
| mainsite-worker   | `eslint-config-prettier`         | development | MIT                     | https://github.com/prettier/eslint-config-prettier                                    |
| mainsite-worker   | `globals`                        | development | MIT                     | https://github.com/sindresorhus/globals                                               |
| mainsite-worker   | `hono`                           | runtime     | MIT                     | https://github.com/honojs/hono                                                        |
| mainsite-worker   | `sanitize-html`                  | runtime     | MIT                     | https://github.com/apostrophecms/apostrophe (`packages/sanitize-html`)                |
| mainsite-worker   | `typescript`                     | development | Apache-2.0              | https://github.com/microsoft/TypeScript                                               |
| mainsite-worker   | `typescript-eslint`              | development | MIT                     | https://github.com/typescript-eslint/typescript-eslint (`packages/typescript-eslint`) |
| mainsite-worker   | `vitest`                         | development | MIT                     | https://github.com/vitest-dev/vitest (`packages/vitest`)                              |
| mainsite-worker   | `wrangler`                       | development | MIT OR Apache-2.0       | https://github.com/cloudflare/workers-sdk (`packages/wrangler`)                       |
| mainsite-worker   | `zod`                            | runtime     | MIT                     | https://github.com/colinhacks/zod                                                     |
