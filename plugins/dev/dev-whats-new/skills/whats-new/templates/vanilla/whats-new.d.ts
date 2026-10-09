// Tipos de whats-new.js para proyectos TypeScript sin framework.

export type WhatsNewText = string | Readonly<Record<string, string>>;

export type WhatsNewLink = { label: WhatsNewText; route: string } | { label: WhatsNewText; href: string };

export interface WhatsNewItem {
  id: string;
  title: WhatsNewText;
  body: WhatsNewText;
  icon?: string;
  image?: string;
  imageAlt?: WhatsNewText;
  /** Vídeo corto en bucle (MP4/WebM). Siempre con `image` como póster. */
  video?: string;
  link?: WhatsNewLink;
  permit?: string;
}

export interface WhatsNewRelease {
  version: string;
  date: string;
  items: WhatsNewItem[];
}

export interface WhatsNewFile {
  schemaVersion: 1;
  releases: WhatsNewRelease[];
}

export type WhatsNewCloseReason = "done" | "skip" | "navigate";

export interface WhatsNewOptions {
  /** Versión de la app en ejecución. Admite -SNAPSHOT. Obligatoria en initWhatsNew. */
  currentVersion?: string;
  url?: string;
  assetsBaseUrl?: string;
  storageKey?: string;
  maxItems?: number;
  lang?: string;
  theme?: "light" | "dark";
  canSee?: (permit: string) => boolean;
  onNavigate?: (link: { label: WhatsNewText; route: string }) => void;
  onClose?: (reason: WhatsNewCloseReason, version: string) => void;
  /** SVG en línea por nombre de icono. */
  icons?: Record<string, string>;
}

export function parseVersion(version: string | null | undefined): [number, number, number] | null;
export function compareVersions(a: readonly number[], b: readonly number[]): number;
export function resolveText(text: WhatsNewText | null | undefined, lang?: string): string;
export function pickPendingRelease(
  file: WhatsNewFile | null | undefined,
  options: { currentVersion: string; lastSeen?: string | null; canSee?: (permit: string) => boolean; maxItems?: number },
): WhatsNewRelease | null;
export function showWhatsNew(release: WhatsNewRelease, options?: WhatsNewOptions): Promise<WhatsNewCloseReason>;
export function initWhatsNew(
  options: WhatsNewOptions & { currentVersion: string },
): Promise<{ shown: boolean; release: WhatsNewRelease | null; reason?: WhatsNewCloseReason }>;
