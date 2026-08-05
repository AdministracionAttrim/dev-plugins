"""
Auto-apply version (sin pedir confirmación)
Uso: python wiki-sync-apply.py
"""
import os
import re
import json

def load_mapping(mapping_file):
    """Carga component-feature-mapping.json"""
    if not os.path.exists(mapping_file):
        print(f"[ERROR] {mapping_file} no existe")
        return {}

    with open(mapping_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_hu_title(hu_id, wiki_root):
    """Extrae título de HU .md"""
    hu_file = os.path.join(wiki_root, 'articles', 'azure', f"{hu_id}.md")

    if not os.path.exists(hu_file):
        return hu_id

    with open(hu_file, 'r', encoding='utf-8') as f:
        for line in f:
            match = re.match(r'^# (HU-\d+\s+-\s+.+)$', line)
            if match:
                return match.group(1)

    return hu_id

def find_component_file(comp_name, wiki_root):
    """Busca el .md file del componente en la wiki y retorna (ruta_absoluta, ruta_relativa)"""
    # Busca recursivamente: components/modules/.../feat-*/feat-*.component.md
    comp_dir = os.path.join(wiki_root, 'components')

    for root, dirs, files in os.walk(comp_dir):
        for file in files:
            if file.endswith('.component.md') and comp_name in root:
                abs_path = os.path.join(root, file)
                # Ruta relativa desde wiki_root
                rel_path = os.path.relpath(abs_path, wiki_root).replace('\\', '/')
                # Sin extension .md para link de Obsidian
                rel_path_link = rel_path[:-3]  # Remove .md
                return abs_path, rel_path_link

    return None, None

def apply_backlinks(mapping, wiki_root):
    """Actualiza backlinks en HU .md files Y component .md files"""
    changes = {}

    # Agrupar por HU
    for comp_name, hu_data in mapping.items():
        if not hu_data:
            continue
            
        hu_list = hu_data if isinstance(hu_data, list) else [hu_data]
        
        for hu_id in hu_list:
            if hu_id == "HU-???":
                continue
            if hu_id not in changes:
                changes[hu_id] = []
            changes[hu_id].append(comp_name)

    if not changes:
        print("[WARN] No hay cambios que hacer")
        return 0

    updated = 0

    # 1. ACTUALIZAR HU .md FILES
    for hu_id, comp_names in sorted(changes.items()):
        hu_file = os.path.join(wiki_root, 'articles', 'azure', f"{hu_id}.md")

        if not os.path.exists(hu_file):
            print(f"[SKIP] {hu_id}.md no existe")
            continue

        with open(hu_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Construir links a componentes (con path relativo de Obsidian)
        comp_links = []
        for comp_name in sorted(comp_names):
            comp_file, comp_link = find_component_file(comp_name, wiki_root)
            if comp_link:
                link = f"- [[{comp_link}|{comp_name}]]"
            else:
                link = f"- [[{comp_name}]]"
            comp_links.append(link)

        new_section = "## Implemented by\n" + "\n".join(comp_links) + "\n"

        # Si ya tiene la sección, reemplazar; si no, insertar
        if "## Implemented by" in content:
            old_match = re.search(
                r"## Implemented by\n(.*?)(?=\n## |\Z)",
                content,
                re.DOTALL
            )
            if old_match:
                old_text = "## Implemented by\n" + old_match.group(1)
                content = content.replace(old_text, new_section)
        else:
            # Insertar antes de "## Related"
            if "## Related" in content:
                content = content.replace(
                    "## Related",
                    new_section + "## Related"
                )
            else:
                # Insertar al final
                content = content.rstrip() + "\n\n" + new_section

        with open(hu_file, 'w', encoding='utf-8') as f:
            f.write(content)

        hu_title = get_hu_title(hu_id, wiki_root)
        print(f"[OK] HU: {hu_id} ({', '.join(sorted(comp_names))})")
        updated += 1

    # 2. ACTUALIZAR COMPONENT .md FILES
    for hu_id, comp_names in sorted(changes.items()):
        hu_title = get_hu_title(hu_id, wiki_root)

        for comp_name in sorted(comp_names):
            comp_file, comp_link = find_component_file(comp_name, wiki_root)

            if not comp_file:
                print(f"[SKIP] {comp_name}.md no encontrado")
                continue

            with open(comp_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Construir link a HU
            hu_link = f"- [[{hu_id}|{hu_title}]]"
            new_section = "## User Stories\n" + hu_link + "\n"

            # Si ya tiene la sección, insertar el link si no está
            if "## User Stories" in content:
                old_match = re.search(
                    r"## User Stories\n(.*?)(?=\n## |\Z)",
                    content,
                    re.DOTALL
                )
                if old_match:
                    existing = old_match.group(1)
                    if hu_id not in existing:
                        new_section_full = "## User Stories\n" + existing + hu_link + "\n"
                        content = re.sub(
                            r"## User Stories\n(.*?)(?=\n## |\Z)",
                            new_section_full.rstrip() + "\n",
                            content,
                            flags=re.DOTALL
                        )
            else:
                # Insertar después de "Related:" line o al final
                if "Related:" in content:
                    content = content.replace(
                        "Related:",
                        new_section + "\nRelated:"
                    )
                else:
                    content = content.rstrip() + "\n\n" + new_section

            with open(comp_file, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"[OK] Component: {comp_name} -> {hu_id}")

    return updated

if __name__ == "__main__":
    MAPPING_FILE = "component-feature-mapping.json"
    WIKI_ROOT = "docs/wiki"

    print("Sincronizando componentes -> HUs...\n")
    mapping = load_mapping(MAPPING_FILE)

    if not mapping:
        print("[ERROR] Mapeo vacio")
        exit(1)

    mapped = {k: v for k, v in mapping.items() if v and (not isinstance(v, list) or len([x for x in v if x != "HU-???"]) > 0)}
    print(f"Componentes a vincular: {len(mapped)} / {len(mapping)}\n")

    updated = apply_backlinks(mapping, WIKI_ROOT)

    if updated > 0:
        print(f"\n[DONE] {updated} HU files actualizados")
    else:
        print("\n[DONE] Sin cambios")
