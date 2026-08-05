import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../../");
const WIKI = path.join(ROOT, "docs", "wiki");

type SearchResult = {
  relPath: string;
  score: number;
  title: string;
};

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.resolve(dir, entry.name);
      return entry.isDirectory() ? getAllFiles(entryPath) : entryPath;
    })
  );

  return Array.prototype.concat(...files);
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function extractTitle(content: string, relPath: string): string {
  const titleLine = content.split(/\r?\n/).find((line) => line.startsWith("# "));
  return titleLine ? titleLine.replace(/^# /, "").trim() : path.basename(relPath, ".md");
}

function scoreResult(relPath: string, title: string, content: string, query: string): number {
  const normalizedPath = normalizePath(relPath).toLowerCase();
  const normalizedTitle = title.toLowerCase();
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  let score = 0;

  if (normalizedPath.startsWith("features/")) score += 100;
  else if (normalizedPath.startsWith("patterns/")) score += 70;
  else if (normalizedPath.startsWith("decisions/")) score += 60;
  else if (normalizedPath.startsWith("research/")) score += 40;
  else if (normalizedPath.startsWith("components/") || normalizedPath.startsWith("services/")) score += 10;

  if (normalizedTitle.includes(normalizedQuery)) score += 40;
  if (normalizedPath.includes(normalizedQuery)) score += 25;
  if (normalizedContent.includes(`scope: \`${normalizedQuery}\``)) score += 15;
  if (normalizedContent.includes(normalizedQuery)) score += 10;

  return score;
}

async function search(query: string) {
  const files = (await getAllFiles(WIKI)).filter((file) => file.endsWith(".md"));
  const results: SearchResult[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    if (!content.toLowerCase().includes(query.toLowerCase())) continue;

    const relPath = normalizePath(path.relative(WIKI, file));
    const title = extractTitle(content, relPath);
    results.push({
      relPath,
      title,
      score: scoreResult(relPath, title, content, query)
    });
  }

  results.sort((left, right) => right.score - left.score || left.relPath.localeCompare(right.relPath));

  if (results.length === 0) {
    console.log(`No results for "${query}".`);
    return;
  }

  console.log(`Top results for "${query}":`);
  for (const result of results.slice(0, 20)) {
    console.log(`- [[${result.relPath.replace(/\.md$/, "")}|${result.title}]] (${result.relPath})`);
  }
}

const query = process.argv.slice(2).join(" ");
if (query) {
  search(query).catch(console.error);
} else {
  console.log("Usage: npx tsx scripts/wiki/search.ts <query>");
}
