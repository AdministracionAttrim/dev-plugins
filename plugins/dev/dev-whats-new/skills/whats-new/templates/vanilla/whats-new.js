/**
 * Novedades por versión — web component sin dependencias (plantilla de dev-whats-new).
 *
 * Lee whats-new.json (contrato schemaVersion 1), decide si hay una versión pendiente
 * de enseñar a este usuario y la muestra una sola vez en un carrusel modal (<dialog>).
 * Se marca como vista al cerrar u omitir, nunca al abrir.
 *
 * Uso mínimo:
 *   import { initWhatsNew } from './whats-new.js';
 *   initWhatsNew({ url: '/whats-new/whats-new.json', currentVersion: '3.1.0' });
 *
 * Tema: variables CSS --wn-* en el elemento <whats-new-dialog> o en :root
 * (ver STYLES). ADAPTAR al design system del proyecto en /whats-new-setup.
 */

const DEFAULTS = {
  url: "whats-new/whats-new.json",
  assetsBaseUrl: "",
  storageKey: "whatsNew.lastSeen",
  maxItems: 3,
  lang: "es",
  canSee: () => true,
  onNavigate: (link) => window.location.assign(link.route),
  onClose: null,
  icons: {},
};

const LABELS = {
  es: { title: "Novedades", previous: "Anterior", next: "Continuar", done: "Entendido", skip: "Omitir", more: "Saber más", goTo: "Ir a la novedad {n} de {total}" },
  en: { title: "What's new", previous: "Previous", next: "Continue", done: "Got it", skip: "Skip", more: "Learn more", goTo: "Go to item {n} of {total}" },
};

// --- Lógica pura (sin DOM): testeable con node --test ---

export function parseVersion(version) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(version ?? "").trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export function resolveText(text, lang = "es") {
  if (text == null) return "";
  if (typeof text === "string") return text;
  const base = String(lang).split("-")[0];
  return text[lang] ?? text[base] ?? text.es ?? Object.values(text)[0] ?? "";
}

/**
 * Devuelve la versión a enseñar (con los items ya filtrados por permiso y recortados)
 * o null si no hay nada que mostrar.
 *  - Solo cuenta la versión más alta <= currentVersion (se ignora el sufijo -SNAPSHOT/-rc).
 *  - Si lastSeen es >= esa versión, nada. Sin lastSeen (usuario nuevo) se muestra.
 *  - Si tras filtrar por permiso no queda ningún item, nada.
 */
export function pickPendingRelease(file, { currentVersion, lastSeen = null, canSee = () => true, maxItems = 3 }) {
  const current = parseVersion(currentVersion);
  if (!current || !file || !Array.isArray(file.releases)) return null;

  const latest = file.releases
    .map((release) => ({ release, v: parseVersion(release.version) }))
    .filter(({ v }) => v && compareVersions(v, current) <= 0)
    .sort((a, b) => compareVersions(b.v, a.v))[0];
  if (!latest) return null;

  const seen = parseVersion(lastSeen);
  if (seen && compareVersions(seen, latest.v) >= 0) return null;

  const items = (latest.release.items ?? []).filter((item) => !item.permit || safeCanSee(canSee, item.permit)).slice(0, maxItems);
  return items.length ? { ...latest.release, items } : null;
}

function safeCanSee(canSee, permit) {
  try {
    return Boolean(canSee(permit));
  } catch {
    return false;
  }
}

function readSeen(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSeen(key, version) {
  try {
    window.localStorage.setItem(key, version);
  } catch {
    // Sin storage (modo privado, bloqueado): se volverá a mostrar, mal menor.
  }
}

// --- Web component ---

const SPARKLES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/><path d="M5 3.5l.6 1.4 1.4.6-1.4.6L5 7.5l-.6-1.4L3 5.5l1.4-.6z"/></svg>';

const STYLES = `
:host {
  --wn-surface: #ffffff;
  --wn-text: #1f2430;
  --wn-muted: #5b6474;
  --wn-border: #e3e6ec;
  --wn-primary: #2f5bea;
  --wn-primary-text: #ffffff;
  --wn-dot: #c9cfda;
  --wn-hero-from: #2f5bea;
  --wn-hero-to: #7a4de8;
  --wn-hero-icon: #ffffff;
  --wn-radius: 16px;
  --wn-font: inherit;
  --wn-backdrop: rgb(15 18 25 / 0.55);
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --wn-surface: #1b1f27; --wn-text: #e8ebf1; --wn-muted: #a3abba; --wn-border: #2d333f;
    --wn-primary: #6d8cff; --wn-primary-text: #0d1020; --wn-dot: #3b4250;
  }
}
:host([theme="dark"]) {
  --wn-surface: #1b1f27; --wn-text: #e8ebf1; --wn-muted: #a3abba; --wn-border: #2d333f;
  --wn-primary: #6d8cff; --wn-primary-text: #0d1020; --wn-dot: #3b4250;
}
dialog {
  width: min(480px, calc(100vw - 32px)); padding: 0; border: 1px solid var(--wn-border);
  border-radius: var(--wn-radius); background: var(--wn-surface); color: var(--wn-text);
  font-family: var(--wn-font); box-shadow: 0 24px 64px rgb(0 0 0 / 0.25); overflow: hidden;
}
dialog.wide { width: min(640px, calc(100vw - 32px)); }
dialog::backdrop { background: var(--wn-backdrop); }
.hero {
  aspect-ratio: 16 / 9; display: grid; place-items: center; color: var(--wn-hero-icon);
  background: linear-gradient(135deg, var(--wn-hero-from), var(--wn-hero-to));
}
.hero img, .hero video { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero svg { width: 72px; height: 72px; }
.content { padding: 20px 24px 8px; min-height: 9.5rem; }
.eyebrow { margin: 0 0 4px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--wn-muted); }
h2 { margin: 0 0 8px; font-size: 1.25rem; line-height: 1.3; }
p.body { margin: 0 0 12px; line-height: 1.5; color: var(--wn-muted); }
.more { color: var(--wn-primary); font-weight: 600; text-decoration: none; background: none; border: 0; padding: 0; font: inherit; cursor: pointer; }
.more:hover { text-decoration: underline; }
footer { display: flex; align-items: center; gap: 12px; padding: 12px 24px 20px; }
.dots { display: flex; gap: 6px; flex: 1; justify-content: center; }
.dots button { width: 8px; height: 8px; padding: 0; border-radius: 999px; border: 0; background: var(--wn-dot); cursor: pointer; }
.dots button[aria-current="true"] { width: 20px; background: var(--wn-primary); }
.btn { font: inherit; border-radius: 8px; padding: 8px 16px; cursor: pointer; border: 1px solid var(--wn-border); background: transparent; color: var(--wn-text); }
.btn.primary { background: var(--wn-primary); border-color: var(--wn-primary); color: var(--wn-primary-text); font-weight: 600; }
.btn[hidden] { display: none; }
.btn.ghost { border-color: transparent; color: var(--wn-muted); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--wn-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) { .content { animation: wn-in 180ms ease-out; } }
@keyframes wn-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: none; } }
`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function defineElement() {
  if (typeof customElements === "undefined" || customElements.get("whats-new-dialog")) return;

  class WhatsNewDialog extends HTMLElement {
    #release = null;
    #opts = DEFAULTS;
    #index = 0;
    #resolve = null;

    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = `<style>${STYLES}</style><dialog aria-labelledby="wn-title"></dialog>`;
      this.dialog = this.shadowRoot.querySelector("dialog");
      this.dialog.addEventListener("cancel", (e) => {
        e.preventDefault();
        this.close("skip");
      });
      this.dialog.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") this.go(this.#index + 1);
        if (e.key === "ArrowLeft") this.go(this.#index - 1);
      });
      this.dialog.addEventListener("click", (e) => this.#onClick(e));
    }

    /** Abre el carrusel. Resuelve con "done" | "skip" | "navigate" al cerrarse. */
    open(release, opts) {
      this.#release = release;
      this.#opts = { ...DEFAULTS, ...opts };
      this.#index = 0;
      // Con vídeo en la versión, ancho para todas sus tarjetas (sin saltos de tamaño).
      this.dialog.classList.toggle("wide", release.items.some((item) => item.video));
      this.render();
      this.dialog.showModal();
      return new Promise((resolve) => (this.#resolve = resolve));
    }

    go(index) {
      if (!this.#release || index < 0 || index >= this.#release.items.length) return;
      this.#index = index;
      this.render();
    }

    close(reason) {
      if (!this.dialog.open) return;
      this.dialog.close();
      this.#opts.onClose?.(reason, this.#release.version); // síncrono: antes de navegar
      this.dispatchEvent(new CustomEvent("whats-new-close", { detail: { reason, version: this.#release.version } }));
      this.#resolve?.(reason);
    }

    #onClick(e) {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const { action, index } = target.dataset;
      const last = this.#index === this.#release.items.length - 1;
      if (action === "prev") this.go(this.#index - 1);
      else if (action === "next") last ? this.close("done") : this.go(this.#index + 1);
      else if (action === "skip") this.close("skip");
      else if (action === "dot") this.go(Number(index));
      else if (action === "more") {
        const link = this.#release.items[this.#index].link;
        if (link?.route) {
          e.preventDefault();
          this.close("navigate");
          this.#opts.onNavigate(link);
        }
      }
    }

    render() {
      const { items, version } = this.#release;
      const { lang, icons, assetsBaseUrl } = this.#opts;
      const t = LABELS[String(lang).split("-")[0]] ?? LABELS.es;
      const item = items[this.#index];
      const total = items.length;
      const last = this.#index === total - 1;
      const title = resolveText(item.title, lang);

      const src = (ref) => escapeHtml(/^https:\/\//.test(ref) ? ref : assetsBaseUrl + ref);
      const alt = escapeHtml(resolveText(item.imageAlt, lang));
      const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      const hero =
        item.video && item.image && !reduced
          ? `<video src="${src(item.video)}" poster="${src(item.image)}" aria-label="${alt}" muted autoplay loop playsinline preload="auto"></video>`
          : item.image
            ? `<img src="${src(item.image)}" alt="${alt}">`
            : icons[item.icon] ?? SPARKLES;

      let more = "";
      if (item.link?.href) {
        more = `<a class="more" href="${escapeHtml(item.link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resolveText(item.link.label, lang) || t.more)} ↗</a>`;
      } else if (item.link?.route) {
        more = `<a class="more" href="${escapeHtml(item.link.route)}" data-action="more">${escapeHtml(resolveText(item.link.label, lang) || t.more)}</a>`;
      }

      const dots =
        total > 1
          ? items
              .map((_, i) => `<button type="button" data-action="dot" data-index="${i}" aria-label="${escapeHtml(t.goTo.replace("{n}", i + 1).replace("{total}", total))}" aria-current="${i === this.#index}"></button>`)
              .join("")
          : "";

      this.dialog.innerHTML = `
        <div class="hero">${hero}</div>
        <div class="content" aria-live="polite">
          <p class="eyebrow">${escapeHtml(t.title)} · v${escapeHtml(version)}</p>
          <h2 id="wn-title">${escapeHtml(title)}</h2>
          <p class="body">${escapeHtml(resolveText(item.body, lang))}</p>
          ${more}
        </div>
        <footer>
          ${this.#index === 0 ? `<button type="button" class="btn ghost" data-action="skip" ${total === 1 ? "hidden" : ""}>${escapeHtml(t.skip)}</button>` : `<button type="button" class="btn" data-action="prev">${escapeHtml(t.previous)}</button>`}
          <div class="dots">${dots}</div>
          <button type="button" class="btn primary" data-action="next" autofocus>${escapeHtml(last ? t.done : t.next)}</button>
        </footer>`;
      this.dialog.querySelector("[autofocus]")?.focus();
    }
  }

  customElements.define("whats-new-dialog", WhatsNewDialog);
}

/** Muestra una versión concreta (p. ej. desde un menú "Novedades"), sin tocar el storage. */
export function showWhatsNew(release, options = {}) {
  defineElement();
  const el = document.createElement("whats-new-dialog");
  if (options.theme) el.setAttribute("theme", options.theme);
  document.body.appendChild(el);
  return el.open(release, options).finally(() => el.remove());
}

/**
 * Punto de entrada: carga el JSON, decide y, si toca, muestra el carrusel y guarda
 * la versión como vista al cerrarlo. Resuelve con { shown, release, reason }.
 */
export async function initWhatsNew(options) {
  const opts = { ...DEFAULTS, ...options };
  if (!opts.currentVersion) throw new Error("initWhatsNew: falta currentVersion");

  let file;
  try {
    const sep = opts.url.includes("?") ? "&" : "?";
    const res = await fetch(`${opts.url}${sep}v=${encodeURIComponent(opts.currentVersion)}`, { cache: "no-cache" });
    if (!res.ok) return { shown: false, release: null };
    file = await res.json();
  } catch {
    return { shown: false, release: null }; // Las novedades nunca deben romper la app.
  }

  const release = pickPendingRelease(file, {
    currentVersion: opts.currentVersion,
    lastSeen: readSeen(opts.storageKey),
    canSee: opts.canSee,
    maxItems: opts.maxItems,
  });
  if (!release) return { shown: false, release: null };

  const reason = await showWhatsNew(release, {
    ...opts,
    onClose: (closeReason, version) => {
      writeSeen(opts.storageKey, version);
      opts.onClose?.(closeReason, version);
    },
  });
  return { shown: true, release, reason };
}
