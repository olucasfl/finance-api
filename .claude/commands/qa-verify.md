---
description: Prova, critério a critério, se a spec está atendida — um curl por critério, contra o serviço local no ar. Não corrige nada.
argument-hint: <caminho-da-spec>
---

Verifique **$ARGUMENTS** contra a implementação atual. Sua entrega é **evidência**, não opinião.

## Regra que define este comando

**Você não corrige nada.** Se algo falhar, reporte e pare. Correção é `/fix-bug`, em outra
execução, com outro agente. Misturar as duas coisas faz o mesmo agente racionalizar um resultado
ruim como aceitável para "fechar a tarefa".

## Preparação

1. Leia a spec e extraia os critérios de aceite. Se não estiverem em BDD, avise na primeira linha.
2. Leia a seção **Requisitos de saída**: método, path, guards, headers, DTO, response. É dela que
   sai cada `curl`.
3. Suba o serviço **local**: `npm run start:dev`. Espere ficar de pé antes de disparar.
   Se não subir, **avise e pare** — não simule resultado.

## Regras de execução

- **Só `http://localhost:3000`.** Nunca produção, nunca `*.onrender.com` (`RULES.md` §1).
- Use um JWT de conta de **teste**, gerado no fluxo de login local. Nunca token de usuário real,
  e **não cole o token no relatório** — escreva `$TOKEN`.
- Não dispare rota que envie e-mail, push, ou que chame a OpenAI, a menos que o critério seja
  exatamente sobre isso — e, nesse caso, diga antes que vai disparar e por quê (`RULES.md` §3).
- Teste também os caminhos negativos que a spec exige: sem token → 401; token de outro usuário →
  não vê o dado alheio; campo não declarado → 400.

## Formato de cada verificação

```
# Critério 3: Dado um mark existente, quando todos os flags zeram, então a linha é removida
curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3000/oratio/bible/marks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"book":"Jo","chapter":3,"verse":16,"highlighted":false,"favorite":false,"note":""}'
```

Cole o comando **e a saída real**.

## Saída

| # | Critério | Passou? | Evidência |
|---|---|---|---|
| 1 | Dado X, quando Y, então Z | ✅ | `curl … → 200 {"deleted":true}` |
| 2 | … | ❌ | esperado 400, recebido 201 |
| 3 | … | ⏸️ | exige `db push` em produção — pendente do humano |

Feche com uma linha: **quantos passaram de quantos**, e se a feature pode ser fechada.
Se houver falha, liste os critérios que falharam — sem propor a correção.
