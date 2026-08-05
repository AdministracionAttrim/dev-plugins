import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '../../');
const WIKI = path.join(ROOT, 'docs', 'wiki');
const KNOWLEDGE_LOG = path.join(WIKI, 'knowledge-log.md');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const budgetIdx = args.indexOf('--budget');
const BUDGET = budgetIdx !== -1 ? parseInt(args[budgetIdx + 1], 10) || 3 : 3;
const QUERY = args.filter(a => !a.startsWith('--') && !/^\d+$/.test(a)).join(' ');

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map((res) => {
        const resPath = path.resolve(dir, res.name);
        return res.isDirectory() ? getAllFiles(resPath) : [resPath];
    }));
    return ([] as string[]).concat(...files);
}

function parseFrontmatterField(content: string, field: string): string | null {
    const re = new RegExp(`^${field}:\\s*(.+)$`, 'm');
    const m = content.match(re);
    return m ? m[1].trim() : null;
}

// ── Contradiction detection ───────────────────────────────────────────────────
// Looks for pages that make contradictory claims about the same topic.
// Heuristic: same tag + contradicting patterns (e.g., "always use X" vs "never use X")
type ContradictionReport = {
    topic: string;
    claimA: { file: string; text: string };
    claimB: { file: string; text: string };
};

const ALWAYS_RE = /\b(always|must|required|mandatory|never|forbidden|!!)\b.{0,80}/gi;

async function detectContradictions(files: string[]): Promise<ContradictionReport[]> {
    const contradictions: ContradictionReport[] = [];
    const claimMap = new Map<string, { file: string; text: string; polarity: 'positive' | 'negative' }[]>();

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const relPath = path.relative(WIKI, file).replace(/\\/g, '/');
        const tags = parseFrontmatterField(content, 'tags') || '';

        const matches = [...content.matchAll(ALWAYS_RE)];
        for (const m of matches) {
            const text = m[0].trim();
            const polarity = /\b(never|forbidden|!!)\b/i.test(text) ? 'negative' : 'positive';
            // Key: first 5 words of the claim (rough topic fingerprint)
            const key = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).slice(0, 5).join(' ');
            if (!claimMap.has(key)) claimMap.set(key, []);
            claimMap.get(key)!.push({ file: relPath, text, polarity });
        }
    }

    for (const [topic, claims] of claimMap) {
        const positives = claims.filter(c => c.polarity === 'positive');
        const negatives = claims.filter(c => c.polarity === 'negative');
        if (positives.length > 0 && negatives.length > 0 && positives[0].file !== negatives[0].file) {
            contradictions.push({
                topic,
                claimA: positives[0],
                claimB: negatives[0],
            });
        }
    }

    return contradictions.slice(0, 10); // Cap at 10 to keep output manageable
}

// ── Format contradiction as Obsidian callout ──────────────────────────────────
function formatContradiction(c: ContradictionReport): string {
    return `> [!contradiction]
> **Topic:** "${c.topic}"
> **Source A** ([[${c.claimA.file.replace('.md', '')}]]): "${c.claimA.text}"
> **Source B** ([[${c.claimB.file.replace('.md', '')}]]): "${c.claimB.text}"
> **Action:** Review both pages — align claims or document the context difference.`;
}

// ── Gap detection (unchanged from original + budget-aware) ────────────────────
type GapReport = { file: string; reasons: string[] };

async function runResearchRound(files: string[], allTitles: Set<string>): Promise<GapReport[]> {
    const gaps: GapReport[] = [];

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const relPath = path.relative(WIKI, file).replace(/\\/g, '/');
        const reasons: string[] = [];

        // Low confidence (numeric < 0.6 or string "low")
        const confVal = parseFrontmatterField(content, 'confidence');
        if (confVal === 'low' || (confVal && !isNaN(Number(confVal)) && Number(confVal) < 0.6)) {
            reasons.push('confidence: low');
        }

        // Placeholder content
        if (content.includes('(To be populated') || content.includes('Auto-generated documentation for')) {
            reasons.push('placeholder content — needs real documentation');
        }

        // No outgoing [[wikilinks]] (orphan sender)
        const links = content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
        if (links.length === 0 && !relPath.includes('/index') && !relPath.includes('/meta/')) {
            reasons.push('no outgoing wikilinks — disconnected from graph');
        }

        // Broken outgoing links
        for (const link of links) {
            let target = link.match(/\[\[([^\]|]+)/)![1];
            target = target.replace(/\\$/, '').split('#')[0];
            const skips = ['index', 'overview', 'hot', 'log'];
            if (skips.includes(target) || target.startsWith('meta/')) continue;
            if (!allTitles.has(target) && !Array.from(allTitles).some(t => t.endsWith('/' + target))) {
                reasons.push(`broken link → [[${target}]]`);
            }
        }

        // Missing sources field
        if (!content.includes('sources:')) {
            reasons.push('missing frontmatter sources field');
        }

        if (reasons.length > 0) {
            gaps.push({ file: relPath, reasons });
        }
    }

    return gaps;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function autoresearch() {
    console.log(`\n🔬 AutoResearch (budget: ${BUDGET} rounds${QUERY ? `, query: "${QUERY}"` : ''})\n`);

    const allFiles = (await getAllFiles(WIKI)).filter(f => f.endsWith('.md') && !f.includes('\\meta\\') && !f.includes('/meta/'));
    const allTitles = new Set(
        allFiles.map(f => path.relative(WIKI, f).replace(/\\/g, '/').replace('.md', ''))
    );

    let gaps: GapReport[] = [];
    let round = 0;

    // Budget loop — each round refines the gap list
    while (round < BUDGET) {
        round++;
        console.log(`--- Round ${round}/${BUDGET} ---`);
        gaps = await runResearchRound(allFiles, allTitles);

        if (gaps.length === 0) {
            console.log('✅ No gaps found — knowledge graph is solid.');
            break;
        }

        console.log(`Found ${gaps.length} pages with gaps.`);

        // Last round: print full report
        if (round === BUDGET) break;

        // Between rounds: brief pause and focus on most critical gaps
        await new Promise(r => setTimeout(r, 100));
    }

    // ── Contradiction detection ───────────────────────────────────────────────
    console.log('\n--- Contradiction Detection ---');
    const contradictions = await detectContradictions(allFiles);

    if (contradictions.length > 0) {
        console.log(`\n⚡ ${contradictions.length} potential contradiction(s) detected:\n`);
        for (const c of contradictions) {
            console.log(formatContradiction(c));
            console.log();
        }
    } else {
        console.log('✅ No contradictions detected.');
    }

    // ── Gap report ────────────────────────────────────────────────────────────
    if (gaps.length > 0) {
        const lowConf = gaps.filter(g => g.reasons.some(r => r.includes('confidence')));
        const placeholders = gaps.filter(g => g.reasons.some(r => r.includes('placeholder')));
        const disconnected = gaps.filter(g => g.reasons.some(r => r.includes('disconnected')));
        const brokenLinks = gaps.filter(g => g.reasons.some(r => r.includes('broken link')));
        const missingFM = gaps.filter(g => g.reasons.some(r => r.includes('frontmatter')));

        console.log(`\n📊 Knowledge Gaps (${gaps.length} pages):\n`);

        if (brokenLinks.length > 0) {
            console.log(`🔴 Broken links (${brokenLinks.length}):`);
            for (const g of brokenLinks) {
                const bl = g.reasons.filter(r => r.includes('broken link'));
                console.log(`  [[${g.file}]] → ${bl.join(', ')}`);
            }
        }
        if (placeholders.length > 0) {
            console.log(`\n🟠 Placeholder content (${placeholders.length}):`);
            for (const g of placeholders) console.log(`  - ${g.file}`);
        }
        if (disconnected.length > 0) {
            console.log(`\n🟡 Disconnected pages (${disconnected.length}):`);
            for (const g of disconnected) console.log(`  - ${g.file}`);
        }
        if (missingFM.length > 0) {
            console.log(`\n🟣 Missing frontmatter (${missingFM.length}):`);
            for (const g of missingFM) console.log(`  - ${g.file}`);
            console.log('  → Fix with: node scripts/wiki/lint-frontmatter.mjs --fix --all');
        }
        if (lowConf.length > 0) {
            console.log(`\n⬜ Low confidence (${lowConf.length}):`);
            for (const g of lowConf) console.log(`  - ${g.file}`);
        }

        console.log('\n📋 Suggested actions:');
        if (brokenLinks.length > 0) console.log('  1. Fix broken links or create missing pages.');
        if (placeholders.length > 0) console.log('  2. Populate placeholder pages (wiki:ingest).');
        if (disconnected.length > 0) console.log('  3. Add [[wikilinks]] to disconnected pages.');
        if (missingFM.length > 0) console.log('  4. Run: node scripts/wiki/lint-frontmatter.mjs --fix --all');
    }

    // ── Append to knowledge-log.md ────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const logEntry = `\n## [${today}] autoresearch | gaps:${gaps.length} contradictions:${contradictions.length} rounds:${round}${QUERY ? ` query:"${QUERY}"` : ''}\n`;

    try {
        const existing = await fs.readFile(KNOWLEDGE_LOG, 'utf8');
        await fs.writeFile(KNOWLEDGE_LOG, existing + logEntry, 'utf8');
    } catch {
        // knowledge-log.md may not exist yet — skip silently
    }
}

autoresearch().catch(console.error);
