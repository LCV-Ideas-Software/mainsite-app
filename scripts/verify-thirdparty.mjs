import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_INVENTORY = "THIRDPARTY.md";
const PUBLIC_INVENTORY = "mainsite-frontend/public/legal/THIRDPARTY.md";
const TABLE_HEADER = [
  "Pacote",
  "Componente",
  "Relação",
  "Versão declarada",
  "Versão efetiva",
  "Licença declarada no lockfile",
  "Modificado?",
  "Origem",
];

function normalizeCell(value) {
  return value.trim().replace(/^`|`$/gu, "");
}

function parseTable(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const headerIndex = lines.findIndex((line) => {
    if (!line.startsWith("|")) return false;
    const cells = line.split("|").slice(1, -1).map(normalizeCell);
    return (
      cells.length === TABLE_HEADER.length &&
      cells.every((cell, index) => cell === TABLE_HEADER[index])
    );
  });
  assert.notEqual(headerIndex, -1, "THIRDPARTY table header is missing");

  const header = lines[headerIndex].split("|").slice(1, -1).map(normalizeCell);
  assert.deepEqual(header, TABLE_HEADER, "THIRDPARTY table header changed");

  const records = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) break;
    const cells = line.split("|").slice(1, -1).map(normalizeCell);
    assert.equal(
      cells.length,
      TABLE_HEADER.length,
      `invalid THIRDPARTY row: ${line}`,
    );
    records.push({
      packageName: cells[0],
      name: cells[1],
      relation: cells[2],
      declaredVersion: cells[3],
      effectiveVersion: cells[4],
      license: cells[5],
      modified: cells[6],
      origin: cells[7],
    });
  }

  assert.notEqual(records.length, 0, "THIRDPARTY table has no components");
  return records;
}

function assertNonEmptyString(value, message) {
  assert.equal(typeof value, "string", message);
  assert.ok(value.trim(), message);
}

export function expectedInventory(manifests) {
  const expected = [];
  const packageNames = new Set();

  for (const { id, packageJson, packageLock } of manifests) {
    assert.ok(!packageNames.has(id), `duplicate manifest id: ${id}`);
    packageNames.add(id);

    const directNames = new Set();
    for (const [manifestKey, relation] of [
      ["dependencies", "runtime"],
      ["devDependencies", "development"],
    ]) {
      for (const [name, declaredVersion] of Object.entries(
        packageJson[manifestKey] ?? {},
      )) {
        assert.ok(
          !directNames.has(name),
          `${id}/${name} appears in multiple dependency groups`,
        );
        directNames.add(name);

        const lockEntry = packageLock.packages?.[`node_modules/${name}`];
        assert.ok(lockEntry, `${id}/${name} is missing from package-lock.json`);
        assertNonEmptyString(
          lockEntry.version,
          `${id}/${name} lacks an effective version`,
        );
        assertNonEmptyString(
          lockEntry.license,
          `${id}/${name} lacks lockfile license metadata`,
        );
        assertNonEmptyString(
          lockEntry.resolved,
          `${id}/${name} lacks a resolved source`,
        );
        assertNonEmptyString(
          lockEntry.integrity,
          `${id}/${name} lacks artifact integrity metadata`,
        );

        expected.push({
          packageName: id,
          name,
          relation,
          declaredVersion,
          effectiveVersion: lockEntry.version,
          license: lockEntry.license,
          modified: "Não",
          origin: lockEntry.resolved,
        });
      }
    }
  }

  return expected.sort(
    (left, right) =>
      left.packageName.localeCompare(right.packageName, "en") ||
      left.name.localeCompare(right.name, "en"),
  );
}

export function verifyThirdPartyInventory({
  manifests,
  rootInventory,
  publicInventory,
}) {
  assert.equal(
    publicInventory,
    rootInventory,
    `${ROOT_INVENTORY} and ${PUBLIC_INVENTORY} must be byte-identical`,
  );

  const actual = parseTable(rootInventory);
  const keys = actual.map(({ packageName, name }) => `${packageName}\0${name}`);
  assert.equal(
    new Set(keys).size,
    keys.length,
    "THIRDPARTY contains duplicate package/component rows",
  );

  assert.deepEqual(
    actual,
    expectedInventory(manifests),
    "THIRDPARTY does not match direct dependency metadata",
  );
}

async function readJson(path) {
  return readFile(path, "utf8").then(JSON.parse);
}

async function main() {
  const root = process.cwd();
  const specs = [
    ["root", "."],
    ["mainsite-frontend", "mainsite-frontend"],
    ["mainsite-worker", "mainsite-worker"],
  ];

  const manifests = await Promise.all(
    specs.map(async ([id, directory]) => ({
      id,
      packageJson: await readJson(resolve(root, directory, "package.json")),
      packageLock: await readJson(
        resolve(root, directory, "package-lock.json"),
      ),
    })),
  );
  const [rootInventory, publicInventory] = await Promise.all([
    readFile(resolve(root, ROOT_INVENTORY), "utf8"),
    readFile(resolve(root, PUBLIC_INVENTORY), "utf8"),
  ]);

  verifyThirdPartyInventory({ manifests, rootInventory, publicInventory });
  console.log(
    `THIRDPARTY inventory matches ${expectedInventory(manifests).length} direct dependency records.`,
  );
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;
if (entryPoint === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
