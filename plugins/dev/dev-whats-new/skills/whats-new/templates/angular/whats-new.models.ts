// Contrato de whats-new.json (schemaVersion 1) y lógica pura de selección.
// Plantilla de dev-whats-new: mantener alineado con skills/whats-new/schema/whats-new.schema.json.

/** Texto plano o por idioma: { es: '…', en: '…' }. */
export type WhatsNewText = string | Readonly<Record<string, string>>;

export type WhatsNewLink =
  | { readonly label: WhatsNewText; readonly route: string; readonly href?: never }
  | { readonly label: WhatsNewText; readonly href: string; readonly route?: never };

export interface WhatsNewItem {
  readonly id: string;
  readonly title: WhatsNewText;
  readonly body: WhatsNewText;
  readonly icon?: string;
  readonly image?: string;
  readonly imageAlt?: WhatsNewText;
  /** Vídeo corto en bucle (MP4/WebM). Siempre con `image` como póster. */
  readonly video?: string;
  readonly link?: WhatsNewLink;
  readonly permit?: string;
}

export interface WhatsNewRelease {
  readonly version: string;
  readonly date: string;
  readonly items: readonly WhatsNewItem[];
}

export interface WhatsNewFile {
  readonly schemaVersion: 1;
  readonly releases: readonly WhatsNewRelease[];
}

export interface PickOptions {
  readonly currentVersion: string;
  readonly lastSeen?: string | null;
  readonly canSee?: (permit: string) => boolean;
  readonly maxItems?: number;
}

type Semver = readonly [number, number, number];

export function parseVersion(version: string | null | undefined): Semver | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(version ?? '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function compareVersions(a: Semver, b: Semver): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export function resolveText(text: WhatsNewText | null | undefined, lang = 'es'): string {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  const base = lang.split('-')[0];
  return text[lang] ?? text[base] ?? text['es'] ?? Object.values(text)[0] ?? '';
}

/**
 * Versión a enseñar (items ya filtrados por permiso y recortados) o null.
 *  - Solo cuenta la versión más alta <= currentVersion (se ignora -SNAPSHOT/-rc).
 *  - Si lastSeen >= esa versión, nada. Sin lastSeen (usuario nuevo) se muestra.
 *  - Si tras filtrar por permiso no queda ningún item, nada.
 */
export function pickPendingRelease(file: WhatsNewFile | null | undefined, options: PickOptions): WhatsNewRelease | null {
  const { currentVersion, lastSeen = null, canSee = () => true, maxItems = 3 } = options;
  const current = parseVersion(currentVersion);
  if (!current || !file || !Array.isArray(file.releases)) return null;

  const latest = file.releases
    .map((release) => ({ release, v: parseVersion(release.version) }))
    .filter((r): r is { release: WhatsNewRelease; v: Semver } => r.v !== null && compareVersions(r.v, current) <= 0)
    .sort((a, b) => compareVersions(b.v, a.v))[0];
  if (!latest) return null;

  const seen = parseVersion(lastSeen);
  if (seen && compareVersions(seen, latest.v) >= 0) return null;

  const items = (latest.release.items ?? []).filter((item) => !item.permit || safeCanSee(canSee, item.permit)).slice(0, maxItems);
  return items.length ? { ...latest.release, items } : null;
}

function safeCanSee(canSee: (permit: string) => boolean, permit: string): boolean {
  try {
    return Boolean(canSee(permit));
  } catch {
    return false;
  }
}
