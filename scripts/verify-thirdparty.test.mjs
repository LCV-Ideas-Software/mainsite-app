import assert from "node:assert/strict";
import { test } from "node:test";

import { verifyThirdPartyInventory } from "./verify-thirdparty.mjs";

const manifests = [
  {
    id: "frontend",
    packageJson: { dependencies: { alpha: "^1.0.0" } },
    packageLock: {
      packages: {
        "node_modules/alpha": {
          version: "1.0.2",
          license: "MIT",
          resolved: "https://registry.npmjs.org/alpha/-/alpha-1.0.2.tgz",
          integrity: "sha512-alpha",
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
  "| frontend | `alpha` | runtime | `^1.0.0` | `1.0.2` | MIT | Não | https://registry.npmjs.org/alpha/-/alpha-1.0.2.tgz |";
const beta =
  "| root | `beta` | development | `~2.0.0` | `2.0.1` | Apache-2.0 | Não | https://registry.npmjs.org/beta/-/beta-2.0.1.tgz |";

function inventory(rows = [alpha, beta]) {
  return `# Third-Party Components

| Pacote | Componente | Relação | Versão declarada | Versão efetiva | Licença declarada no lockfile | Modificado? | Origem |
|--------|------------|---------|------------------|----------------|--------------------------------|-------------|--------|
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

test("rejects an extra component", () => {
  const gamma = alpha.replaceAll("alpha", "gamma");
  assert.throws(
    () => verify({ rootInventory: inventory([alpha, beta, gamma]) }),
    /does not match/u,
  );
});

test("rejects duplicate package/component rows", () => {
  assert.throws(
    () => verify({ rootInventory: inventory([alpha, alpha, beta]) }),
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

test("fails closed when lockfile license metadata is absent", () => {
  const changed = structuredClone(manifests);
  delete changed[0].packageLock.packages["node_modules/alpha"].license;
  assert.throws(
    () => verify({ manifests: changed }),
    /lacks lockfile license metadata/u,
  );
});
