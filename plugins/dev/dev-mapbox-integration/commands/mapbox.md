---
description: Consulta al agente mapbox-architect de este plugin sobre arquitectura, capas, clustering, dibujo de polígonos, estilos o geocoding con Mapbox GL JS.
argument-hint: "[--layers|--cluster|--draw|--style|--geocode|--docs|--snippet] <pregunta>"
allowed-tools: Task, Read, Glob, Grep, WebFetch
---

Invoca al agente `mapbox-architect` de este plugin con: $ARGUMENTS

Si se usa el flag `--docs`, el agente debe hacer WebFetch a la documentación oficial de Mapbox antes de responder. Si se usa `--snippet`, la respuesta debe ser solo código, sin explicación.
