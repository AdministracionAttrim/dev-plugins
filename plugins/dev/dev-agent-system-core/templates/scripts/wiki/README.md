# Wiki Automation Scripts

These scripts power the autonomous knowledge system for the LLM Wiki.

## Commands

Run these via `npm` (configured in `package.json`):

| Command | Description | Path |
|---------|-------------|------|
| `npm run wiki:ingest` | Process `docs/raw/inbox` files and update the wiki. | `scripts/wiki/ingest.ts` |
| `npm run wiki:watch` | Watch `docs/raw/inbox` for changes and ingest automatically. | `scripts/wiki/watch.ts` |
| `npm run wiki:lint` | Check for broken links and integrity issues in `docs/wiki/`. | `scripts/wiki/lint.ts` |
| `npm run wiki:search <term>` | Keyword search across all wiki markdown files. | `scripts/wiki/search.ts` |
| `npm run wiki:research` | Identify knowledge gaps and low-confidence pages. | `scripts/wiki/autoresearch.ts` |
| `python scripts/wiki/azure-script.py` | Sync Azure Boards work items into `docs/raw/inbox/azure/` for wiki ingestion. Optional — only if the project tracks work in Azure DevOps. **First-use setup**: add `AZURE_READ_API_KEY` (read-only PAT for Boards), `AZURE_ORG` and `AZURE_PROJECT` to `.env.local` before running it; the script exits with instructions if any is missing. | `scripts/wiki/azure-script.py` |

## Technical Details

- **Runtime**: Scripts are executed using `tsx` (via `npx`).
- **Target Directories**:
    - Raw Data: `docs/raw/`
    - Wiki Base: `docs/wiki/`
- **Configuration**: System rules are defined in `CLAUDE.md`.

## Notes
- The AI assistant fully owns the `docs/wiki/` directory.
- Avoid manual edits to wiki files to prevent sync issues with the automation layer.
- `wiki:full-ingest` now prioritizes route-driven feature pages under `docs/wiki/features/**`.
- Use feature pages as the first stop; component/service pages are secondary drill-down docs.
- `wiki:search` ranks `features/`, `patterns/`, and `decisions/` ahead of low-value generated pages.
- `wiki:full-ingest` prunes module-specific component/service/store docs under `docs/wiki/components/modules/**` and `docs/wiki/services/modules/**`.
- `wiki:full-ingest` keeps `docs/wiki/articles/**` limited to curated source material from `docs/raw/**` and `docs/raw/articles/**`.
- `wiki:watch` now listens to `src/app/**`, `public/i18n/modules/**`, `docs/raw/articles/**`, and `docs/raw/articles/**` and reruns `wiki:full-ingest` when those sources change.
- Azure Wiki pages are compiled as live articles: code is canonical, and the generated article surfaces tracked files plus a current implementation snapshot.
