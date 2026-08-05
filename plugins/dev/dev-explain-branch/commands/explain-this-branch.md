---
description: Genera la descripción de la MR/PR de la rama actual frente a la rama base, orientada al reviewer. Con --azure=<ID>, además publica un resumen técnico como comentario en ese work item de Azure DevOps (previa confirmación).
argument-hint: "[rama-base opcional, default develop] [--azure=<ID>]"
allowed-tools: Bash, Read, Write
---

Invoca la skill `explain-this-branch` de este plugin con los argumentos: $ARGUMENTS

Si no se indica rama base, usa `develop` (o `main`/`master` si el proyecto no usa `develop`). Si se indica `--azure=<ID>`, activa además el modo Azure DevOps descrito en la skill, mostrando siempre el texto exacto antes de publicar y esperando confirmación explícita del usuario.
