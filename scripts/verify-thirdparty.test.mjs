import assert from "node:assert/strict";
import { test } from "node:test";

import { verifyThirdPartyInventory } from "./verify-thirdparty.mjs";

const manifests = [
  {
    id: "frontend",
    packageJson: {
      dependencies: { alpha: "^1.0.0" },
      optionalDependencies: { gamma: "^3.0.0" },
      peerDependencies: { delta: "^4.0.0" },
      devDependencies: { delta: "^4.0.0" },
    },
    packageLock: {
      packages: {
        "node_modules/alpha": {
          version: "1.0.2",
          license: "MIT",
          resolved: "https://registry.npmjs.org/alpha/-/alpha-1.0.2.tgz",
          integrity: "sha512-alpha",
        },
        "node_modules/gamma": {
          version: "3.0.4",
          license: "ISC",
          resolved: "https://registry.npmjs.org/gamma/-/gamma-3.0.4.tgz",
          integrity: "sha512-gamma",
        },
        "node_modules/delta": {
          version: "4.0.5",
          license: "MIT",
          resolved: "https://registry.npmjs.org/delta/-/delta-4.0.5.tgz",
          integrity: "sha512-delta",
        },
      },
    },
  },
  {
    id: "root",
    packageJson: { devDependencies: { beta: "~2.0.0" } },
    packageLock: {
      packages: {
        "node_modules/beta": {
          version: "2.0.1",
          license: "Apache-2.0",
          resolved: "https://registry.npmjs.org/beta/-/beta-2.0.1.tgz",
          integrity: "sha512-beta",
        },
      },
    },
  },
];

const alpha =
  "| frontend | `alpha` | runtime | `^1.0.0` | `1.0.2` | MIT | sha512-alpha | Não | https://registry.npmjs.org/alpha/-/alpha-1.0.2.tgz |";
const beta =
  "| root | `beta` | development | `~2.0.0` | `2.0.1` | Apache-2.0 | sha512-beta | Não | https://registry.npmjs.org/beta/-/beta-2.0.1.tgz |";
const gamma =
  "| frontend | `gamma` | optional | `^3.0.0` | `3.0.4` | ISC | sha512-gamma | Não | https://registry.npmjs.org/gamma/-/gamma-3.0.4.tgz |";
const delta =
  "| frontend | `delta` | peer | `^4.0.0` | `4.0.5` | MIT | sha512-delta | Não | https://registry.npmjs.org/delta/-/delta-4.0.5.tgz |";
const deltaDev =
  "| frontend | `delta` | development | `^4.0.0` | `4.0.5` | MIT | sha512-delta | Não | https://registry.npmjs.org/delta/-/delta-4.0.5.tgz |";

function inventory(rows = [alpha, deltaDev, delta, gamma, beta]) {
  return `# Third-Party Components

| Pacote | Componente | Relação | Versão declarada | Versão efetiva | Licença declarada no lockfile | Integridade do artefato | Modificado? | Origem |
|--------|------------|---------|------------------|----------------|--------------------------------|-------------------------|-------------|--------|
${rows.join("\n")}
`;
}

function verify(overrides = {}) {
  const rootInventory = overrides.rootInventory ?? inventory();
  verifyThirdPartyInventory({
    manifests: overrides.manifests ?? manifests,
    rootInventory,
    publicInventory: overrides.publicInventory ?? rootInventory,
  });
}

test("accepts complete byte-identical inventories", () => {
  assert.doesNotThrow(() => verify());
});

test("rejects divergence between published copies", () => {
  assert.throws(
    () => verify({ publicInventory: `${inventory()}\n` }),
    /byte-identical/u,
  );
});

test("rejects a missing direct dependency", () => {
  assert.throws(
    () => verify({ rootInventory: inventory([alpha]) }),
    /does not match/u,
  );
});

test("rejects a missing optional dependency", () => {
  assert.throws(
    () => verify({ rootInventory: inventory([alpha, deltaDev, delta, beta]) }),
    /does not match/u,
  );
});

test("rejects a missing peer dependency", () => {
  assert.throws(
    () => verify({ rootInventory: inventory([alpha, deltaDev, gamma, beta]) }),
    /does not match/u,
  );
});

test("uses optionalDependencies precedence over dependencies", () => {
  const changed = structuredClone(manifests);
  changed[0].packageJson.optionalDependencies.alpha = "^1.0.0";
  const optionalAlpha = alpha.replace("| runtime |", "| optional |");
  assert.doesNotThrow(() =>
    verify({
      manifests: changed,
      rootInventory: inventory([optionalAlpha, deltaDev, delta, gamma, beta]),
    }),
  );
});

test("allows peer and development relations for the same component", () => {
  assert.doesNotThrow(() => verify());
});

test("rejects an extra component", () => {
  const epsilon = alpha.replaceAll("alpha", "epsilon");
  assert.throws(
    () =>
      verify({
        rootInventory: inventory([
          alpha,
          deltaDev,
          delta,
          gamma,
          beta,
          epsilon,
        ]),
      }),
    /does not match/u,
  );
});

test("rejects duplicate package/component rows", () => {
  assert.throws(
    () =>
      verify({
        rootInventory: inventory([alpha, alpha, deltaDev, delta, gamma, beta]),
      }),
    /duplicate/u,
  );
});

test("rejects declared-version drift", () => {
  assert.throws(
    () =>
      verify({ rootInventory: inventory().replace("`^1.0.0`", "`^1.9.0`") }),
    /does not match/u,
  );
});

test("rejects effective-version drift", () => {
  assert.throws(
    () => verify({ rootInventory: inventory().replace("`1.0.2`", "`1.0.1`") }),
    /does not match/u,
  );
});

test("rejects license drift", () => {
  assert.throws(
    () => verify({ rootInventory: inventory().replace("| MIT |", "| ISC |") }),
    /does not match/u,
  );
});

test("rejects source drift", () => {
  assert.throws(
    () =>
      verify({
        rootInventory: inventory().replace(
          "alpha-1.0.2.tgz",
          "alpha-1.0.1.tgz",
        ),
      }),
    /does not match/u,
  );
});

test("rejects integrity drift", () => {
  assert.throws(
    () =>
      verify({
        rootInventory: inventory().replace("sha512-alpha", "sha512-tampered"),
      }),
    /does not match/u,
  );
});

test("rejects undeclared modification drift", () => {
  assert.throws(
    () =>
      verify({
        rootInventory: inventory().replace(
          "sha512-alpha | Não |",
          "sha512-alpha | Sim |",
        ),
      }),
    /does not match/u,
  );
});

test("accepts an explicit modification override", () => {
  const changed = structuredClone(manifests);
  changed[0].modified = { ["alpha\0runtime"]: "Sim" };
  assert.doesNotThrow(() =>
    verify({
      manifests: changed,
      rootInventory: inventory().replace(
        "sha512-alpha | Não |",
        "sha512-alpha | Sim |",
      ),
    }),
  );
});

test("fails closed when lockfile license metadata is absent", () => {
  const changed = structuredClone(manifests);
  delete changed[0].packageLock.packages["node_modules/alpha"].license;
  assert.throws(
    () => verify({ manifests: changed }),
    /lacks lockfile license metadata/u,
  );
});
