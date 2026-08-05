import { execSync } from "child_process";
import { watch } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../../");
const INBOX = path.join(ROOT, "docs", "raw", "inbox");
const FULL_INGEST_TARGETS = [
  path.join(ROOT, "src", "app"),
  path.join(ROOT, "public", "i18n", "modules"),
  path.join(ROOT, "docs", "raw", "articles")
];

const pending = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 700;

function trigger(command: string, reason: string) {
  console.log(`[wiki:watch] ${reason}`);
  try {
    execSync(command, { stdio: "inherit", cwd: ROOT });
  } catch (error) {
    console.error("[wiki:watch] command failed:", error);
  }
}

function schedule(key: string, command: string, reason: string) {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing);

  pending.set(
    key,
    setTimeout(() => {
      pending.delete(key);
      trigger(command, reason);
    }, DEBOUNCE_MS)
  );
}

console.log(`[wiki:watch] Watching inbox: ${INBOX}`);
watch(INBOX, { recursive: true }, (eventType, filename) => {
  if (!filename || eventType !== "rename") return;
  schedule("inbox", "npx tsx scripts/wiki/ingest.ts", `Inbox change detected in ${filename}. Running ingest...`);
});

for (const target of FULL_INGEST_TARGETS) {
  console.log(`[wiki:watch] Watching live source: ${target}`);
  watch(target, { recursive: true }, (_eventType, filename) => {
    if (!filename) return;
    schedule("full-ingest", "npx tsx scripts/wiki/full-ingest.ts", `Project change detected in ${filename}. Running full-ingest...`);
  });
}
