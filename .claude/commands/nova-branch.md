---
description: Cria uma branch nova a partir de develop, sem herdar rastreamento da branch protegida
argument-hint: <tipo/nome — ex.: feat/biblia-marks>
---

Crie a branch **$ARGUMENTS**.

## Validação

1. O nome precisa começar com `feat/`, `fix/`, `chore/` ou `docs/`. Se não começar, **pare e
   proponha** um nome válido.
2. Confira se há trabalho não commitado: `git status --short`. Se houver, **pare e pergunte**.

## Comandos

```
git fetch origin develop
git checkout -b $ARGUMENTS FETCH_HEAD
```

**Use `FETCH_HEAD`, nunca `origin/develop`.** Com `origin/develop`, a branch nova nasce
rastreando a protegida, e o próximo `git push` sem argumento tenta empurrar para ela.

## Depois

```
git rev-parse --abbrev-ref HEAD
git status -sb
```

O upstream deve aparecer vazio — a branch ainda não existe no remoto, e isso é o esperado.
