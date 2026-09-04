---
name: doutrina-guardrail
description: Preflight obrigatório antes de escrever ou alterar o prompt do VoxAI — VOX_IDENTITY, VOX_PROFILES, systemAppend. Use sempre que a tarefa tocar vox.prompt.ts, mesmo que a mudança pareça cosmética.
---

# Guardrail de doutrina — `vox.prompt.ts`

`src/modules/oratio/voxai/prompts/vox.prompt.ts` não é configuração. É **a doutrina que o app ensina**,
em escala: cada palavra ali se multiplica por toda resposta que o Vox dá a todo usuário.

A divisão é deliberada e não pode ser borrada:

- **`VOX_IDENTITY`** — quem o Vox é e o que ele nunca faz. **Doutrina.**
- **`VOX_PROFILES[].systemAppend`** — como ele fala num perfil. **Tom e estrutura, só.**

O erro que esta skill existe para evitar: o modelo "melhorar" uma resposta afrouxando uma
restrição doutrinária, e ninguém perceber porque o texto ficou mais fluido.

## Preflight — as cinco perguntas

Responda por escrito, antes de abrir o arquivo:

1. **Estou mexendo em `VOX_IDENTITY` ou em `systemAppend`?** Se for `VOX_IDENTITY`, é doutrina:
   exige aprovação explícita antes de qualquer edição, não depois.
2. **Esta tarefa era sobre isso?** Se você chegou aqui no meio de outra coisa — teste, refactor,
   ajuste de token — **pare**. Doutrina não muda de carona (`RULES.md` §4).
3. **A mudança afrouxa alguma restrição?** Remover uma proibição, abrandar um "nunca", tornar
   opcional uma exigência de citar fonte. Se sim: **pare e pergunte**, mesmo que a resposta
   pareça melhor sem ela.
4. **Estou duplicando algo que já está em `VOX_IDENTITY`?** Regra repetida no `systemAppend`
   gasta token, cria ambiguidade quando as duas divergirem, e confunde o escopo dos perfis.
5. **Alguma citação nova?** Catecismo, concílio, encíclica, versículo, documento papal — sem
   fonte confirmada, não entra.

## Regras que não se negociam

- **`systemAppend` trata de tom e estrutura. Nunca de doutrina.** Se o perfil precisa dizer algo
   doutrinário, o lugar é `VOX_IDENTITY` — e aí vale para os seis perfis, não para um.
- **Nunca invente citação.** Nem número de parágrafo do Catecismo, nem referência bíblica, nem
  atribuição a um Papa. Sem fonte confirmada, diga que não encontrou e pare.
- **Nunca afrouxe fidelidade doutrinária para melhorar a qualidade percebida da resposta.** Se
  o perfil parece engessado, isso é uma conversa com o humano, não uma edição.
- **Aceite humano perfil a perfil.** É o gate que `docs/tasks/vox-profiles-todo.md` já exige:
  *"Usuário revisa e aceita este perfil (registrar 'aceito' no commit/PR)"*. Vale também para
  ajuste posterior, não só para o texto inicial.

## Como apresentar uma mudança para aceite

Não basta mostrar o diff do prompt — o que importa é o **efeito**. Apresente:

1. O diff do `systemAppend` (ou do `VOX_IDENTITY`).
2. **Uma pergunta plausível de usuário do app** — do tipo que aparece de verdade no Vox.
3. A resposta **antes** e a resposta **depois**, lado a lado.
4. O que mudou no tom, e a confirmação explícita de que **nada mudou na doutrina**.

Sem os itens 2 e 3, o humano está aceitando texto, não comportamento — e é o comportamento que
chega no usuário.

## Custo, e por que ele importa aqui

Cada verificação dessas é uma chamada real à OpenAI, que **cobra por chamada** (`RULES.md` §3).
Não rode a matriz inteira "para ver": monte a pergunta certa, rode uma vez, e mostre o resultado.
A matriz completa (6 perfis × 5 perguntas) é um exercício deliberado, com o humano ciente — não
um passo de verificação automática.

## Ao terminar

- `npm test` verde (os testes de contrato do prompt não podem quebrar).
- O commit registra **"aceito"** e diz qual perfil.
- Se a mudança foi em `VOX_IDENTITY`, `docs/ARCHITECTURE.md` §6 é atualizado no mesmo commit.
