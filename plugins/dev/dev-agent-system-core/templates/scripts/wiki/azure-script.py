import os
import sys
import json
import requests
import base64
import re
import html
from pathlib import Path

from urllib.parse import urlparse
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# =========================
# CONFIG
# =========================
def _find_project_root():
    for parent in Path(__file__).resolve().parents:
        if (parent / "package.json").exists():
            return parent
    raise RuntimeError("No se encontró la raíz del proyecto (package.json)")

PROJECT_ROOT = _find_project_root()
CACHE_PATH = PROJECT_ROOT / ".azure-sync-cache.json"

def load_env_file():
    env_path = PROJECT_ROOT / ".env.local"
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

load_env_file()

PAT = os.getenv("AZURE_READ_API_KEY")
ORG = os.getenv("AZURE_ORG")
PROJECT = os.getenv("AZURE_PROJECT")

_missing = [name for name, value in (("AZURE_READ_API_KEY", PAT), ("AZURE_ORG", ORG), ("AZURE_PROJECT", PROJECT)) if not value]
if _missing:
    print(f"Error: faltan variables de entorno {', '.join(_missing)} (ni en entorno ni en .env.local).")
    print("Primer uso: añade a .env.local en la raíz del proyecto:")
    print("  AZURE_READ_API_KEY=<tu PAT de Azure DevOps, permiso de solo lectura sobre Boards>")
    print("  AZURE_ORG=<organización de Azure DevOps, ej. la que aparece en https://dev.azure.com/<ORG>>")
    print("  AZURE_PROJECT=<nombre del proyecto de Azure Boards a sincronizar>")
    sys.exit(1)

BASE_URL = f"https://dev.azure.com/{ORG}/{PROJECT}/_apis"

TYPE_PREFIX = {
    "User Story": "HU",
    "Bug": "BUG",
    "Change Request": "CR",
    "Feature": "FEAT",
    "Epic": "EPIC",
}

# =========================
# HTTP SESSION (retry + backoff)
# =========================
def _make_session():
    session = requests.Session()
    retry = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
        raise_on_status=False,
    )
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session

SESSION = _make_session()

# =========================
# AUTH
# =========================
def headers():
    token = base64.b64encode(f":{PAT}".encode()).decode()
    return {
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json"
    }

# =========================
# REV CACHE
# =========================
def load_rev_cache() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}

def save_rev_cache(cache: dict) -> None:
    CACHE_PATH.write_text(json.dumps(cache), encoding="utf-8")

# =========================
# CLEAN HTML
# =========================
def clean_html(raw):
    if not raw:
        return ""

    text = html.unescape(raw)

    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'</p>', '\n\n', text)
    text = re.sub(r'<li[^>]*>', '- ', text)
    text = re.sub(r'</li>', '\n', text)

    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()

# =========================
# HELPERS
# =========================
def get_key(wi):
    tipo = wi["fields"].get("System.WorkItemType", "")
    prefix = TYPE_PREFIX.get(tipo, "WI")
    return f"{prefix}-{wi['id']}"

def build_items_index(items):
    return {wi["id"]: wi for wi in items}

def link(i, items_by_id):
    wi = items_by_id.get(i)
    if not wi:
        return f"[[WI-{i}|WI-{i} (no disponible)]]"

    tipo = wi["fields"].get("System.WorkItemType", "")
    prefix = TYPE_PREFIX.get(tipo, "WI")
    title = wi["fields"].get("System.Title", "")

    return f"[[{prefix}-{i}|{prefix}-{i} {title}]]"

def _parse_workitem_id(url: str) -> int | None:
    path = urlparse(url).path
    part = path.split("/")[-1]
    try:
        return int(part)
    except ValueError:
        return None

# =========================
# 1. GET IDS
# =========================
def get_ids():
    query = {
        "query": """
        SELECT [System.Id]
        FROM WorkItems
        WHERE [System.WorkItemType] IN ('User Story','Bug','Change Request')
        AND [System.Tags] NOT CONTAINS 'Design'
        """
    }

    r = SESSION.post(
        f"{BASE_URL}/wit/wiql?api-version=7.0",
        json=query,
        headers=headers()
    )

    if not r.ok or not r.text.strip():
        print(f"Error HTTP {r.status_code}: {r.text[:500]}")
        r.raise_for_status()

    try:
        data = r.json()
    except Exception:
        print(f"Respuesta no JSON (status {r.status_code}):\n{r.text[:500]}")
        raise

    return [i["id"] for i in data.get("workItems", [])]

# =========================
# 2. GET ITEMS + RELATIONS
# =========================
def get_items(ids):
    items = []
    chunk = 200

    for i in range(0, len(ids), chunk):
        batch = ids[i:i+chunk]

        r = SESSION.get(
            f"{BASE_URL}/wit/workitems?ids={','.join(map(str, batch))}&$expand=relations&api-version=7.0",
            headers=headers()
        )
        r.raise_for_status()

        items.extend(r.json()["value"])

    return items

# =========================
# 2b. FETCH ORPHAN ITEMS
# Items referenced in relations but not in the initial batch
# (Features, Epics, deleted items, cross-area items, etc.)
# =========================
def fetch_orphans(items, graph):
    known_ids = {wi["id"] for wi in items}
    orphan_ids = set()

    for node in graph.values():
        for id_ in (
            ([node["parent"]] if node["parent"] else [])
            + node["children"]
            + node["related"]
            + node["depends"]
        ):
            if id_ not in known_ids:
                orphan_ids.add(id_)

    if not orphan_ids:
        return []

    print(f"Obteniendo {len(orphan_ids)} items referenciados fuera del batch...")
    try:
        orphans = get_items(list(orphan_ids))
        return orphans
    except Exception as e:
        print(f"  Aviso: no se pudieron obtener orphans ({e})")
        return []

# =========================
# 3. BUILD GRAPH
# =========================
def build_graph(items):
    graph = {}

    for wi in items:
        graph[wi["id"]] = {
            "children": [],
            "parent": None,
            "related": [],
            "depends": []
        }

    for wi in items:
        id_ = wi["id"]

        for rel in wi.get("relations", []):
            url = rel.get("url", "")

            if "/workItems/" not in url:
                continue

            target_id = _parse_workitem_id(url)
            if target_id is None:
                continue

            rel_type = rel.get("rel", "")

            if "Hierarchy-Forward" in rel_type:
                graph[id_]["children"].append(target_id)

            elif "Hierarchy-Reverse" in rel_type:
                graph[id_]["parent"] = target_id

            elif "Related" in rel_type:
                graph[id_]["related"].append(target_id)

            elif "Dependency" in rel_type:
                graph[id_]["depends"].append(target_id)

    return graph

def get_discussions(work_item_id):
    r = SESSION.get(
        f"{BASE_URL}/wit/workitems/{work_item_id}/comments?api-version=7.1-preview.4",
        headers=headers()
    )
    if r.status_code != 200:
        return ""
    comments = r.json().get("comments", [])

    if not comments:
        return ""

    text = "## Discussions\n\n"
    for idx, c in enumerate(comments):
        author = c.get("createdBy", {}).get("displayName", "Unknown")
        created = c.get("createdDate", "")[:10]
        message = clean_html(c.get("text", ""))
        separator = "\n\n---\n\n" if idx < len(comments) - 1 else "\n\n"
        text += f"**{author}** - {created}\n{message}{separator}"

    return text

# Types that produce a .md file (main batch + orphan stubs)
EXPORT_TYPES = {"User Story", "Bug", "Change Request", "Feature", "Epic"}
EMPTY_REL = {"parent": None, "children": [], "related": [], "depends": []}

# =========================
# 4. EXPORT TO INBOX
# =========================
def export(items, graph, extra_items=None, output_dir="obsidian", rev_cache=None):
    os.makedirs(output_dir, exist_ok=True)
    all_items = items + (extra_items or [])
    items_by_id = build_items_index(all_items)
    rev_cache = rev_cache if rev_cache is not None else {}

    exportable_ids = {
        wi["id"] for wi in all_items
        if wi["fields"].get("System.WorkItemType", "") in EXPORT_TYPES
    }

    items_to_export = [wi for wi in all_items if wi["id"] in exportable_ids]
    total = len(items_to_export)
    skipped = 0

    print("Exportando work items...")

    for i, wi in enumerate(items_to_export, 1):
        f = wi["fields"]
        id_ = wi["id"]
        key = get_key(wi)
        changed = f.get("System.ChangedDate", "")
        cache_key = str(id_)
        file_path = Path(output_dir) / f"{key}.md"

        # Saltar items sin cambios si el fichero ya existe en el output
        if rev_cache.get(cache_key) == changed and file_path.exists():
            skipped += 1
            print(f"Procesado {i}/{total} → {key} (sin cambios)", end="\r")
            continue

        tipo = f.get("System.WorkItemType", "")
        estado = f.get("System.State", "")
        title = f.get("System.Title", "")

        desc = clean_html(f.get("System.Description", ""))
        repro = clean_html(f.get("Microsoft.VSTS.TCM.ReproSteps", "")) if tipo == "Bug" else ""
        tech = clean_html(f.get("Custom.TechnicalDescription", ""))
        crit = clean_html(f.get("Microsoft.VSTS.Common.AcceptanceCriteria", ""))
        priority = f.get("Microsoft.VSTS.Common.Priority", "")

        # Solo pedir comments si el item tiene alguno
        comment_count = f.get("System.CommentCount", 0) or 0
        discussions = get_discussions(id_) if comment_count > 0 else ""

        with open(file_path, "w", encoding="utf-8") as file:
            file.write(f"""---
id: {id_}
tipo: {tipo}
estado: {estado}
prioridad: {priority}
---
""")
            file.write(f"# {key} - {title}\n\n")

            file.write("## Descripción\n")
            file.write(desc + "\n\n")

            if repro:
                file.write("## Repro Steps\n")
                file.write(repro + "\n\n")

            if tech:
                file.write("## Technical Description\n")
                file.write(tech + "\n\n")

            if crit:
                file.write("## Criterios / Técnica\n")
                file.write(crit + "\n\n")

            if discussions:
                file.write(discussions)

            rel = graph.get(id_, EMPTY_REL)
            parent_id = rel["parent"] if rel["parent"] in exportable_ids else None
            children = [c for c in rel["children"] if c in exportable_ids]
            related = [r for r in rel["related"] if r in exportable_ids]
            depends = [d for d in rel["depends"] if d in exportable_ids]

            if any([parent_id, children, related, depends]):
                file.write("## Relaciones\n")
                if parent_id:
                    file.write(f"- Parent: {link(parent_id, items_by_id)}\n")
                if children:
                    file.write("- Hijos:\n")
                    for c in children:
                        file.write(f"  - {link(c, items_by_id)}\n")
                if related:
                    file.write("- Relacionados:\n")
                    for r in related:
                        file.write(f"  - {link(r, items_by_id)}\n")
                if depends:
                    file.write("- Dependencias:\n")
                    for d in depends:
                        file.write(f"  - {link(d, items_by_id)}\n")

            file.write("\n")

        rev_cache[cache_key] = changed
        print(f"Procesado {i}/{total} → {key}", end="\r")

    exported = total - skipped
    print(f"\n\nExportados {exported} work items ({skipped} sin cambios omitidos) → '{output_dir}'")

# =========================
# MAIN
# =========================
if __name__ == "__main__":
    output_dir = PROJECT_ROOT / "docs" / "raw" / "inbox" / "azure"
    print(f"Output: {output_dir}")

    rev_cache = load_rev_cache()

    print("Obteniendo IDs...")
    ids = get_ids()

    if not ids:
        print("No se encontraron work items con los filtros indicados.")
        sys.exit(0)

    print(f"{len(ids)} encontrados. Descargando...")
    items = get_items(ids)
    all_items = list(items)
    graph = build_graph(all_items)

    # Fetch iterativo: orphans de orphans hasta estabilizar (máx 3 rondas)
    for round_n in range(1, 4):
        new_orphans = fetch_orphans(all_items, graph)
        if not new_orphans:
            break
        print(f"  Ronda {round_n}: {len(new_orphans)} referencias nuevas.")
        all_items = all_items + new_orphans
        graph = build_graph(all_items)

    known_ids = {wi["id"] for wi in items}
    extra = [wi for wi in all_items if wi["id"] not in known_ids]

    print("Exportando...")
    export(items, graph, extra_items=extra, output_dir=output_dir, rev_cache=rev_cache)

    save_rev_cache(rev_cache)
    print("Done.")
