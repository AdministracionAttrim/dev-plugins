import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '../../');
const DOCS_RAW = path.join(ROOT, 'docs', 'raw');
const DOCS_WIKI = path.join(ROOT, 'docs', 'wiki');
const INBOX = path.join(DOCS_RAW, 'inbox');

async function ensureDir(p: string) {
    try { await fs.mkdir(p, { recursive: true }); } catch (e) {}
}

async function updateIndex(title: string, summary: string) {
    const indexPath = path.join(DOCS_WIKI, 'index.md');
    let content = await fs.readFile(indexPath, 'utf8');
    
    const entry = `| [[${title}]] | ${summary} | ${new Date().toISOString().split('T')[0]} |\n`;
    
    if (content.includes(`[[${title}]]`)) {
        // Update existing entry
        const lines = content.split('\n');
        const index = lines.findIndex(l => l.includes(`[[${title}]]`));
        lines[index] = entry;
        content = lines.join('\n');
    } else {
        // Add to the Navigation table
        content = content.replace('## Navigation\n\n| Page | Summary | Last Updated |\n|------|---------|--------------|', 
                                  `## Navigation\n\n| Page | Summary | Last Updated |\n|------|---------|--------------|\n${entry}`);
    }
    
    await fs.writeFile(indexPath, content, 'utf8');
}

async function appendLog(operation: string, title: string) {
    const logPath = path.join(DOCS_WIKI, 'log.md');
    const date = new Date().toISOString().split('T')[0];
    const entry = `\n## [${date}] ${operation} | ${title}\n- Processed knowledge entry for ${title}.\n`;
    await fs.appendFile(logPath, entry, 'utf8');
}

const AZURE_PREFIXES = ['HU-', 'BUG-', 'TASK-', 'CR-'];

function isAzureWorkItem(title: string): boolean {
    const upper = title.toUpperCase();
    return AZURE_PREFIXES.some(prefix => upper.startsWith(prefix));
}

function getWikiSection(title: string): string {
    const upper = title.toUpperCase();
    if (upper.startsWith('HU-'))   return 'articles';
    if (upper.startsWith('BUG-'))  return 'bugs';
    if (upper.startsWith('TASK-')) return 'tasks';
    if (upper.startsWith('CR-'))   return 'decisions';
    return 'research';
}

async function ingestFiles(dir: string, subdir: string, processed: string[]) {
    const entries = await fs.readdir(dir);

    for (const entry of entries) {
        const src = path.join(dir, entry);
        const stat = await fs.stat(src);

        if (stat.isDirectory()) {
            await ingestFiles(src, entry, processed);
            continue;
        }

        const content = await fs.readFile(src, 'utf8');
        const title = path.parse(entry).name;
        const ext = path.parse(entry).ext.toLowerCase();

        if (!subdir && isAzureWorkItem(title)) {
            console.warn(`⚠️  AVISO: "${entry}" parece un work item de Azure DevOps pero está en el raíz del inbox.`);
            console.warn(`   Muévelo a docs/raw/inbox/azure/ para que quede en la ruta correcta de la wiki.`);
            console.warn(`   Se procesará igualmente, pero la ruta wiki no incluirá el subdirectorio "azure/".`);
        }

        const wikiSection = getWikiSection(title);
        let folder = wikiSection;
        let type = 'article';

        if (ext === '.ts' || ext === '.js' || ext === '.html' || ext === '.css') {
            folder = 'code';
            type = 'code';
        } else if (ext === '.pdf' || ext === '.docx') {
            folder = 'docs';
            type = 'document';
        }
        const wikiDir = subdir
            ? path.join(DOCS_WIKI, wikiSection, subdir)
            : path.join(DOCS_WIKI, wikiSection);
        await ensureDir(wikiDir);
        const wikiPagePath = path.join(wikiDir, `${title}.md`);


        const tags = ['ingest', wikiSection, ...(subdir ? [subdir] : [])].join(', ');
        const wikiRef = subdir ? `${wikiSection}/${subdir}/${title}` : `${wikiSection}/${title}`;

        let preservedRelaciones = '';
        try {
            const existing = await fs.readFile(wikiPagePath, 'utf8');
            if (!content.includes('## Relaciones')) {
                const match = existing.match(/## Relaciones[\s\S]*?(?=\n## |\s*$)/);
                if (match) preservedRelaciones = '\n' + match[0].trimEnd();
            }
        } catch { /* fichero nuevo, no hay nada que preservar */ }

        const frontmatter = `---
type: ${type}
tags: [${tags}]
confidence: low
explored: false
last_updated: ${new Date().toISOString().split('T')[0]}
sources: [inbox]
---

# ${title}

${content}${preservedRelaciones}

## Related
[[index]]
`;

        await fs.writeFile(wikiPagePath, frontmatter, 'utf8');
        await fs.unlink(src);

        await updateIndex(wikiRef, `Ingested ${type}: ${title}`);
        processed.push(wikiRef);

        console.log(`Ingested ${entry} -> ${wikiRef}.md`);
    }
}

async function ingest() {
    await ensureDir(INBOX);
    const processed: string[] = [];
    await ingestFiles(INBOX, '', processed);
    if (processed.length > 0) {
        await appendLog('ingest', `${processed.length} items: ${processed.join(', ')}`);
    }
}

ingest().catch(console.error);
