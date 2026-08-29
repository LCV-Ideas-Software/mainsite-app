import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const CHECKOUT_SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const LINEAR_ACTION_SHA = "3f31fcf14c110cc53579fcc3575a26d469c413b4";
const WRANGLER_ACTION_SHA = "ebbaa1584979971c8614a24965b4405ff95890e0";

const repositoryRoot = new URL("../", import.meta.url);
const workflowDirectory = new URL(".github/workflows/", repositoryRoot);
const linearReleaseSource = await readFile(
  new URL("linear-release.yml", workflowDirectory),
  "utf8",
);
const deploySource = await readFile(
  new URL("deploy.yml", workflowDirectory),
  "utf8",
);
const actionsLockSource = await readFile(
  new URL("actions.lock", workflowDirectory),
  "utf8",
);
const agentsGuide = await readFile(
  new URL("AGENTS.md", repositoryRoot),
  "utf8",
);

function occurrences(source, value) {
  return source.split(value).length - 1;
}

function lockChildBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `lock block not found: ${marker.trim()}`);
  const end = source.indexOf("\n    '", start + marker.length);
  assert.notEqual(
    end,
    -1,
    `lock block has no terminal boundary: ${marker.trim()}`,
  );
  return source.slice(start, end);
}

test("Linear Release remains downstream of the exact successful Deploy SHA", () => {
  assert.match(
    linearReleaseSource,
    /workflow_run:[\s\S]*workflows:\s*\n\s*- Deploy\s*\n\s*types:\s*\n\s*- completed/u,
  );
  assert.match(
    linearReleaseSource,
    /github\.event\.workflow_run\.conclusion == 'success'[\s\S]*github\.event\.workflow_run\.head_branch == 'main'/u,
  );
  assert.match(
    linearReleaseSource,
    /group: linear-release-\$\{\{ github\.event\.workflow_run\.head_branch \}\}-\$\{\{ github\.event\.workflow_run\.conclusion \}\}/u,
  );
  assert.match(linearReleaseSource, /queue: max/u);
  assert.doesNotMatch(linearReleaseSource, /cancel-in-progress:/u);
  assert.match(linearReleaseSource, /environment: linear-release/u);
  assert.match(linearReleaseSource, /permissions:\s*\n\s*contents: read/u);
  assert.match(
    linearReleaseSource,
    new RegExp(`uses: actions/checkout@${CHECKOUT_SHA}`, "u"),
  );
  assert.match(
    linearReleaseSource,
    /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/u,
  );
  assert.match(linearReleaseSource, /fetch-depth: 0/u);
  assert.match(linearReleaseSource, /persist-credentials: false/u);
});

test("Linear Release uses the signed official action and fails closed", () => {
  assert.equal(
    occurrences(
      linearReleaseSource,
      `linear/linear-release-action@${LINEAR_ACTION_SHA}`,
    ),
    1,
  );
  assert.match(
    linearReleaseSource,
    /access_key: \$\{\{ secrets\.LINEAR_ACCESS_KEY \}\}/u,
  );
  assert.match(linearReleaseSource, /cli_version: v0\.16\.0/u);
  assert.doesNotMatch(linearReleaseSource, /continue-on-error:\s*true/u);
  assert.doesNotMatch(
    linearReleaseSource,
    /linear-release-linux-x64|CLI_SHA256|curl -fsSL|sha256sum/u,
  );
});

test("the official Wrangler action preserves both deploys and their order", async () => {
  const wranglerAction = `cloudflare/wrangler-action@${WRANGLER_ACTION_SHA}`;
  assert.equal(occurrences(deploySource, wranglerAction), 2);
  assert.equal(occurrences(deploySource, 'wranglerVersion: "4.123.0"'), 2);

  const worker = deploySource.indexOf("- name: Deploy Worker with Wrangler");
  const frontend = deploySource.indexOf(
    "- name: Deploy frontend with Wrangler",
  );
  assert.ok(worker >= 0 && frontend > worker);
  assert.match(
    deploySource.slice(worker, frontend),
    /workingDirectory: mainsite-worker[\s\S]*command: deploy --strict/u,
  );
  assert.match(
    deploySource.slice(frontend),
    /workingDirectory: mainsite-frontend[\s\S]*command: pages deploy dist --project-name=mainsite-frontend --branch=main --commit-dirty=true/u,
  );

  const workflowSources = await Promise.all(
    (await readdir(workflowDirectory))
      .filter((name) => /\.ya?ml$/u.test(name))
      .map((name) => readFile(new URL(name, workflowDirectory), "utf8")),
  );
  assert.doesNotMatch(
    workflowSources.join("\n"),
    /slackapi\/slack-github-action@|hooks\.slack\.com|slack\.com\/api\/chat\.postMessage|chat\.postMessage|SLACK_WEBHOOK|SLACK_BOT_TOKEN/u,
  );
});

test("actions.lock and agent policy encode the same contract", () => {
  const linearAction = `linear/linear-release-action@${LINEAR_ACTION_SHA}`;
  assert.equal(
    lockChildBlock(
      actionsLockSource,
      "    '.github/workflows/linear-release.yml':\n",
    ),
    [
      "    '.github/workflows/linear-release.yml':",
      `        - 'actions/checkout@${CHECKOUT_SHA}'`,
      `        - '${linearAction}'`,
    ].join("\n"),
  );
  assert.equal(
    lockChildBlock(actionsLockSource, `    '${linearAction}':\n`),
    [
      `    '${linearAction}':`,
      "        ref: 'v0.16.0'",
      `        commit: 'sha1-${LINEAR_ACTION_SHA}'`,
      "        owner_id: 46686594",
      "        repo_id: 1150447766",
    ].join("\n"),
  );
  assert.match(agentsGuide, /single `cross-review` service/u);
  assert.doesNotMatch(agentsGuide, /cross-review-v[12]/u);
});
