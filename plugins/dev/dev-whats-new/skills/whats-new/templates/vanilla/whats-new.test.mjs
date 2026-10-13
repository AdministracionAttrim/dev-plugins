// Tests de la lógica pura de whats-new.js. Ejecutar: node --test whats-new.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickPendingRelease, resolveText, parseVersion } from "./whats-new.js";

const item = (id, extra = {}) => ({ id, title: `Título ${id}`, body: `Texto de la novedad ${id}`, ...extra });
const file = {
  schemaVersion: 1,
  releases: [
    { version: "3.2.0", date: "2026-12-01", items: [item("futuro")] },
    { version: "3.1.0", date: "2026-10-20", items: [item("a"), item("b", { permit: "OPS.VIEW" }), item("c"), item("d")] },
    { version: "3.0.0", date: "2026-09-29", items: [item("viejo")] },
  ],
};

test("usuario nuevo ve la última versión <= la actual, ignorando -SNAPSHOT", () => {
  const r = pickPendingRelease(file, { currentVersion: "3.1.0-SNAPSHOT" });
  assert.equal(r.version, "3.1.0");
});

test("no repite una versión ya vista ni anteriores", () => {
  assert.equal(pickPendingRelease(file, { currentVersion: "3.1.0", lastSeen: "3.1.0" }), null);
  assert.equal(pickPendingRelease(file, { currentVersion: "3.1.0", lastSeen: "3.1.5" }), null);
  assert.equal(pickPendingRelease(file, { currentVersion: "3.1.0", lastSeen: "3.0.0" }).version, "3.1.0");
});

test("filtra por permiso y recorta a maxItems", () => {
  const r = pickPendingRelease(file, { currentVersion: "3.1.0", canSee: () => false, maxItems: 3 });
  assert.deepEqual(r.items.map((i) => i.id), ["a", "c", "d"]);
  const r2 = pickPendingRelease(file, { currentVersion: "3.1.0", canSee: (p) => p === "OPS.VIEW", maxItems: 2 });
  assert.deepEqual(r2.items.map((i) => i.id), ["a", "b"]);
});

test("sin items visibles no hay modal; un canSee que lanza cuenta como no visible", () => {
  const onlyPermit = { schemaVersion: 1, releases: [{ version: "1.0.0", date: "2026-01-01", items: [item("x", { permit: "P" })] }] };
  assert.equal(pickPendingRelease(onlyPermit, { currentVersion: "1.0.0", canSee: () => { throw new Error("boom"); } }), null);
});

test("versión actual ilegible o fichero vacío no muestran nada", () => {
  assert.equal(pickPendingRelease(file, { currentVersion: "dev" }), null);
  assert.equal(pickPendingRelease({ schemaVersion: 1, releases: [] }, { currentVersion: "1.0.0" }), null);
  assert.equal(pickPendingRelease(null, { currentVersion: "1.0.0" }), null);
});

test("resolveText con string, idioma exacto, idioma base y fallback", () => {
  assert.equal(resolveText("hola"), "hola");
  assert.equal(resolveText({ es: "hola", en: "hi" }, "en"), "hi");
  assert.equal(resolveText({ es: "hola", en: "hi" }, "en-GB"), "hi");
  assert.equal(resolveText({ es: "hola" }, "fr"), "hola");
  assert.equal(resolveText(undefined), "");
});

test("parseVersion", () => {
  assert.deepEqual(parseVersion("v3.1.0-SNAPSHOT"), [3, 1, 0]);
  assert.equal(parseVersion("abc"), null);
});
