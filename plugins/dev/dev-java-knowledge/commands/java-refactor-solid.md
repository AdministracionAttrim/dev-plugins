---
description: Revisa una clase Java frente a los principios SOLID y clean code, y propone (sin aplicar automaticamente) un refactor concreto.
argument-hint: <ruta de la clase a revisar>
allowed-tools: Read, Glob, Grep
---

Revisa la clase indicada aplicando las skills `solid-principles` y `clean-code` de este plugin: $ARGUMENTS

Para cada violacion detectada (SRP, OCP, LSP, ISP, DIP, nombres poco claros, metodos demasiado largos, numeros magicos, abstraccion prematura), explica:

1. Que principio se viola y por que.
2. El riesgo concreto que introduce (no una afirmacion generica de "mal diseno").
3. El refactor propuesto, con un ejemplo breve de codigo (antes/despues) solo si aclara algo que la prosa no deja claro.

No apliques el refactor tu mismo salvo que el usuario lo pida explicitamente despues de ver la propuesta.
