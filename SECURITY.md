# Security Policy

## Supported status

Current supported internal versions: mainsite-frontend v03.25.00 and mainsite-worker v02.22.00. The current deployment from `main` is the supported security target. This migration retires GitHub Release and version-tag publication; any legacy objects awaiting post-merge cleanup are not supported security targets.

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities, credential leaks, private data exposure, authentication bypasses, payment-flow issues, supply-chain issues, or deployment misconfiguration.

Report privately by email:

- security@lcv.dev

If GitHub private vulnerability reporting is enabled for this repository, that channel is also acceptable.

Please include:

- affected repository, component, route, package, workflow, or public surface;
- affected internal version, commit SHA, or deployment URL when known;
- impact and exploitability;
- reproduction steps or a safe proof of concept, if available;
- whether any credential, personal data, payment data, private editorial material, or operational secret may be involved.

## Scope

In scope: application code, Workers/Pages functions, package publication, GitHub Actions, dependency and supply-chain configuration, repository publication boundaries, security documentation, and public service configuration documented in this repository.

Out of scope: social engineering, physical attacks, denial-of-service testing without prior written authorization, spam, automated noisy scanning, and reports that rely only on outdated browser or dependency versions without a concrete vulnerable path in this repository.

## Automation and credentials

- Pull requests against `main` run the `CI` workflow (lint, Biome, tests and a strict Wrangler dry run
  for `mainsite-worker`; lint, Biome, tests and build for `mainsite-frontend`), Dependency Review,
  zizmor and the Pages build; `npm audit` runs only on pushes to `main`, inside the `Deploy`
  workflow, together with lint, Biome and tests of both packages, the frontend build and the two
  Wrangler deployments. The repository ruleset `main: required
  checks` requires `CI`, `Build Pages artifact`, `Dependency Review` and `Run zizmor` before any
  merge into `main`.
- This repository handles its own Dependabot pull requests with the repository-local workflow
  `.github/workflows/dependabot-auto-merge.yml`. It runs only on `pull_request` events of
  Dependabot-authored pull requests from this repository against `main` (an event initiated by a
  person runs and fails visibly without the token), grants no `GITHUB_TOKEN` permission, runs no
  Action, checkout, cache, artifact, or pull-request-controlled command, and enables GitHub's
  native auto-merge (squash) bound to the exact event head. GitHub performs the merge only after
  every rule of the effective rulesets and every required check is satisfied. The token is one
  organization-level Dependabot secret, `DEPENDABOT_AUTOMERGE_TOKEN`, shared by every repository
  of the organization, a residual the operator accepted on 02/09/2026.
- Credentials live only in environments, by name: `cloudflare-production` holds
  `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for the `Deploy` workflow; `linear-release`
  holds `LINEAR_ACCESS_KEY` for the `Linear Release` workflow; `github-pages` and every other
  environment hold nothing. The repository has no Actions secrets or variables of its own, and no
  secret value belongs in Git.

## Coordinated disclosure

LCV Ideas & Software will triage reports privately, request clarification when needed, and coordinate remediation before public disclosure. Public disclosure should wait until a fix or mitigation is available, unless there is an immediate user-safety reason to do otherwise.
