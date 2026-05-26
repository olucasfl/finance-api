export interface R32SlotDefinition {
  slot: number;
  homeDesc: string;
  awayDesc: string;
  homeSource: { pos: number; group: string } | null;
  awaySource: { pos: number; group: string } | null;
  awayIsThird: boolean;
  thirdGroups: string[]; // grupos elegíveis para essa vaga de terceiro
}

// ─── Tabela oficial FIFA Copa 2026 — Round of 32 ──────────────────────────────
// Fonte: regras oficiais FIFA + documento de regras de negócio do projeto
//
// ⚠️ SLOT 16: o documento de referência tem inconsistência — 2K aparece em
// ambos os slots 12 e 16. O homeTeam do slot 16 está marcado como MANUAL_OVERRIDE.
// O admin deve corrigi-lo via PATCH /cravou/admin/bracket/:slotId/teams após
// confirmação da tabela oficial FIFA.
// ─────────────────────────────────────────────────────────────────────────────

export const R32_SLOT_DEFINITIONS: R32SlotDefinition[] = [
  {
    slot: 1,
    homeDesc: '1º Grupo A',
    awayDesc: 'Melhor 3º (C, E ou H)',
    homeSource: { pos: 1, group: 'A' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: ['C', 'E', 'H'],
  },
  {
    slot: 2,
    homeDesc: '1º Grupo B',
    awayDesc: '2º Grupo A',
    homeSource: { pos: 1, group: 'B' },
    awaySource: { pos: 2, group: 'A' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 3,
    homeDesc: '1º Grupo C',
    awayDesc: '2º Grupo F',
    homeSource: { pos: 1, group: 'C' },
    awaySource: { pos: 2, group: 'F' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 4,
    homeDesc: '1º Grupo D',
    awayDesc: 'Melhor 3º (A, B, G ou I)',
    homeSource: { pos: 1, group: 'D' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: ['A', 'B', 'G', 'I'],
  },
  {
    slot: 5,
    homeDesc: '1º Grupo E',
    awayDesc: 'Melhor 3º (A, B, G ou I)',
    homeSource: { pos: 1, group: 'E' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: ['A', 'B', 'G', 'I'],
  },
  {
    slot: 6,
    homeDesc: '1º Grupo F',
    awayDesc: '2º Grupo E',
    homeSource: { pos: 1, group: 'F' },
    awaySource: { pos: 2, group: 'E' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 7,
    homeDesc: '1º Grupo G',
    awayDesc: 'Melhor 3º (C, E ou H)',
    homeSource: { pos: 1, group: 'G' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: ['C', 'E', 'H'],
  },
  {
    slot: 8,
    homeDesc: '1º Grupo H',
    awayDesc: '2º Grupo G',
    homeSource: { pos: 1, group: 'H' },
    awaySource: { pos: 2, group: 'G' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 9,
    homeDesc: '1º Grupo I',
    awayDesc: '2º Grupo J',
    homeSource: { pos: 1, group: 'I' },
    awaySource: { pos: 2, group: 'J' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 10,
    homeDesc: '1º Grupo J',
    awayDesc: 'Melhor 3º (D, F, J ou L)',
    homeSource: { pos: 1, group: 'J' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: ['D', 'F', 'J', 'L'],
  },
  {
    slot: 11,
    homeDesc: '1º Grupo K',
    awayDesc: '2º Grupo L',
    homeSource: { pos: 1, group: 'K' },
    awaySource: { pos: 2, group: 'L' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 12,
    homeDesc: '1º Grupo L',
    awayDesc: '2º Grupo K',
    homeSource: { pos: 1, group: 'L' },
    awaySource: { pos: 2, group: 'K' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 13,
    homeDesc: '2º Grupo B',
    awayDesc: '2º Grupo C',
    homeSource: { pos: 2, group: 'B' },
    awaySource: { pos: 2, group: 'C' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 14,
    homeDesc: '2º Grupo D',
    awayDesc: '2º Grupo I',
    homeSource: { pos: 2, group: 'D' },
    awaySource: { pos: 2, group: 'I' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 15,
    homeDesc: '2º Grupo H',
    awayDesc: 'Melhor 3º (D, F, J ou L)',
    homeSource: { pos: 2, group: 'H' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: ['D', 'F', 'J', 'L'],
  },
  {
    slot: 16,
    homeDesc: 'CONFIRMAR COM FIFA', // ⚠️ inconsistência no documento — admin deve corrigir
    awayDesc: 'Melhor 3º (C, E ou H)',
    homeSource: null,
    awaySource: null,
    awayIsThird: true,
    thirdGroups: ['C', 'E', 'H'],
  },
];

// ─── Chaveamento do Round of 16 (vencedores do R32) ─────────────────────────
export const R16_BRACKET = [
  { slot: 1, homeFromR32: 1, awayFromR32: 2 },
  { slot: 2, homeFromR32: 3, awayFromR32: 4 },
  { slot: 3, homeFromR32: 5, awayFromR32: 6 },
  { slot: 4, homeFromR32: 7, awayFromR32: 8 },
  { slot: 5, homeFromR32: 9, awayFromR32: 10 },
  { slot: 6, homeFromR32: 11, awayFromR32: 12 },
  { slot: 7, homeFromR32: 13, awayFromR32: 14 },
  { slot: 8, homeFromR32: 15, awayFromR32: 16 },
];

// ─── Quartas de Final ────────────────────────────────────────────────────────
export const QF_BRACKET = [
  { slot: 1, homeFromR16: 1, awayFromR16: 2 },
  { slot: 2, homeFromR16: 3, awayFromR16: 4 },
  { slot: 3, homeFromR16: 5, awayFromR16: 6 },
  { slot: 4, homeFromR16: 7, awayFromR16: 8 },
];

// ─── Semifinais ──────────────────────────────────────────────────────────────
export const SF_BRACKET = [
  { slot: 1, homeFromQF: 1, awayFromQF: 2 },
  { slot: 2, homeFromQF: 3, awayFromQF: 4 },
];
