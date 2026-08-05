import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '../../');
const WIKI = path.join(ROOT, 'docs', 'wiki');

async function getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map((res) => {
        const resPath = path.resolve(dir, res.name);
        return res.isDirectory() ? getAllFiles(resPath) : resPath;
    }));
    return Array.prototype.concat(...files);
}

async function lint() {
    const files = (await getAllFiles(WIKI)).filter(f => f.endsWith('.md'));
    const fileContents = await Promise.all(files.map(f => fs.readFile(f, 'utf8')));
    const allTitles = files.map(f => path.relative(WIKI, f).replace(/\\/g, '/').replace('.md', ''));
    
    let issues = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const content = fileContents[i];
        const relPath = path.relative(WIKI, file);
        
        // Check for broken [[wikilinks]]
        const links = content.match(/\[\[(.*?)\]\]/g) || [];
        for (const link of links) {
            const targetMatch = link.match(/\[\[(.*?)(?:\\?\||\]\])/);
            if (!targetMatch) continue;
            let target = targetMatch[1].trim();
            if (target === 'index' || target === 'overview' || target === 'hot' || target === 'log' || target.startsWith('http')) continue;
            
            // Remove hash from target (e.g. [[page#section]])
            target = target.split('#')[0];
            
            // Handle absolute-like paths in wiki
            if (!allTitles.includes(target) && !allTitles.some(t => t.endsWith('/' + target))) {
                console.warn(`[BROKEN LINK] ${relPath}: ${link}`);
                issues++;
            }
        }
        
        // Check for orphan pages (not linked by index or others)
        // Simplified: just check if it's in index.md
    }
    
    if (issues === 0) {
        console.log('Wiki lint passed! No broken links found.');
    } else {
        console.log(`Wiki lint found ${issues} issues.`);
    }
}

lint().catch(console.error);
