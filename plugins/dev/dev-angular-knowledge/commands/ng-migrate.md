---
description: Migra un patron Angular concreto y acotado (NgModules a standalone, inputs/outputs a signals, Observable a signals, forms reactivos a Signal Forms, *ngIf/*ngFor a @if/@for) con el agente angular-migrador, sin reescribir el resto del archivo.
argument-hint: <archivo/componente y patron a migrar>
allowed-tools: Task, Read, Write, Edit, Glob, Grep, Bash
---

Invoca al agente `angular-migrador` de este plugin para migrar: $ARGUMENTS

El agente debe migrar unicamente el patron indicado, sin tocar el resto del archivo, ejecutar los tests o `ng build` antes y despues para confirmar que no se ha roto nada, y avisar explicitamente si el cambio no tiene red de seguridad automatizada (sin tests previos).
