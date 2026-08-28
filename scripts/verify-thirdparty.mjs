import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_INVENTORY = "THIRDPARTY.md";
const PUBLIC_INVENTORY = "mainsite-frontend/public/legal/THIRDPARTY.md";
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".wrangler",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const TABLE_HEADER = [
  "Pacote",
  "Componente",
  "Relação",
  "Versão declarada",
  "Versão efetiva",
  "Licença declarada no lockfile",
  "Integridade do artefato",
  "Modificado?",
  "Origem",
];

function normalizeCell(value) {
  return value.trim().replace(/^`|`$/gu, "");
}

function tableCells(line) {
  return line.trimStart().split("|").slice(1, -1).map(normalizeCell);
}

function parseTable(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const headerIndex = lines.findIndex((line) => {
    if (!line.trimStart().startsWith("|")) return false;
    const cells = tableCells(line);
    return (
      cells.length === TABLE_HEADER.length &&
      cells.every((cell, index) => cell === TABLE_HEADER[index])
    );
  });
  assert.notEqual(headerIndex, -1, "THIRDPARTY table header is missing");

  const header = tableCells(lines[headerIndex]);
  assert.deepEqual(header, TABLE_HEADER, "THIRDPARTY table header changed");
  const separator = tableCells(lines[headerIndex + 1] ?? "");
  assert.equal(
    separator.length,
    TABLE_HEADER.length,
    "THIRDPARTY table separator is invalid",
  );
  assert.ok(
    separator.every((cell) => /^:?-{3,}:?$/u.test(cell)),
    "THIRDPARTY table separator is invalid",
  );

  const records = [];
  let endIndex = headerIndex + 2;
  for (; endIndex < lines.length; endIndex += 1) {
    const line = lines[endIndex];
    if (!line.trimStart().startsWith("|")) break;
    const cells = tableCells(line);
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
      integrity: cells[6],
      modified: cells[7],
      origin: cells[8],
    });
  }
  assert.equal(
    lines.slice(endIndex).filter((line) => line.trimStart().startsWith("|"))
      .length,
    0,
    "THIRDPARTY contains table rows after the inventory",
  );

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

  for (const { id, packageJson, packageLock, modified = {} } of manifests) {
    assert.ok(!packageNames.has(id), `duplicate manifest id: ${id}`);
    packageNames.add(id);

    const optionalNames = new Set(
      Object.keys(packageJson.optionalDependencies ?? {}),
    );
    for (const [manifestKey, relation] of [
      ["dependencies", "runtime"],
      ["optionalDependencies", "optional"],
      ["peerDependencies", "peer"],
      ["devDependencies", "development"],
    ]) {
      for (const [name, declaredVersion] of Object.entries(
        packageJson[manifestKey] ?? {},
      )) {
        if (manifestKey === "dependencies" && optionalNames.has(name)) {
          continue;
        }

        const lockEntry = packageLock.packages?.[`node_modules/${name}`];
        const isUninstalledOptionalPeer =
          manifestKey === "peerDependencies" &&
          packageJson.peerDependenciesMeta?.[name]?.optional === true &&
          !lockEntry;
        if (isUninstalledOptionalPeer) {
          continue;
        }
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
        const modification = modified[`${name}\0${relation}`] ?? "Não";
        assert.match(
          modification,
          /^(?:Sim|Não)$/u,
          `${id}/${name}/${relation} has an invalid modification status`,
        );

        expected.push({
          packageName: id,
          name,
          relation,
          declaredVersion,
          effectiveVersion: lockEntry.version,
          license: lockEntry.license,
          integrity: lockEntry.integrity,
          modified: modification,
          origin: lockEntry.resolved,
        });
      }
    }
  }

  return expected.sort(
    (left, right) =>
      left.packageName.localeCompare(right.packageName, "en") ||
      left.name.localeCompare(right.name, "en") ||
      left.relation.localeCompare(right.relation, "en"),
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
  const keys = actual.map(
    ({ packageName, name, relation }) => `${packageName}\0${name}\0${relation}`,
  );
  assert.equal(
    new Set(keys).size,
    keys.length,
    "THIRDPARTY contains duplicate package/component/relation rows",
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

export async function discoverManifestDirectories(root) {
  const found = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    if (
      entries.some((entry) => entry.isFile() && entry.name === "package.json")
    ) {
      const directoryRelative = relative(root, directory);
      found.push(directoryRelative || ".");
    }
    await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name),
        )
        .map((entry) => visit(resolve(directory, entry.name))),
    );
  }

  await visit(root);
  return found.sort((left, right) => left.localeCompare(right, "en"));
}

async function main() {
  const root = process.cwd();
  const directories = await discoverManifestDirectories(root);

  const manifests = await Promise.all(
    directories.map(async (directory) => ({
      id: directory === "." ? "root" : directory.split(sep).join("/"),
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
