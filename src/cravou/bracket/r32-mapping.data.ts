export interface R32SlotDefinition {
  slot: number;
  homeDesc: string;
  awayDesc: string;
  homeSource: { pos: number; group: string } | null;
  awaySource: { pos: number; group: string } | null;
  awayIsThird: boolean;
  thirdGroups: string[];
}

// ─── Tabela FIFA Copa 2026 — Round of 32 (jogos 73-88) ───────────────────────
export const R32_SLOT_DEFINITIONS: R32SlotDefinition[] = [
  {
    slot: 1,
    homeDesc: '2º Grupo A',
    awayDesc: '2º Grupo B',
    homeSource: { pos: 2, group: 'A' },
    awaySource: { pos: 2, group: 'B' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 2,
    homeDesc: '1º Grupo E',
    awayDesc: 'Melhor 3º',
    homeSource: { pos: 1, group: 'E' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: [],
  },
  {
    slot: 3,
    homeDesc: '1º Grupo F',
    awayDesc: '2º Grupo C',
    homeSource: { pos: 1, group: 'F' },
    awaySource: { pos: 2, group: 'C' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 4,
    homeDesc: '1º Grupo C',
    awayDesc: '2º Grupo F',
    homeSource: { pos: 1, group: 'C' },
    awaySource: { pos: 2, group: 'F' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 5,
    homeDesc: '1º Grupo I',
    awayDesc: 'Melhor 3º',
    homeSource: { pos: 1, group: 'I' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: [],
  },
  {
    slot: 6,
    homeDesc: '2º Grupo E',
    awayDesc: '2º Grupo I',
    homeSource: { pos: 2, group: 'E' },
    awaySource: { pos: 2, group: 'I' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 7,
    homeDesc: '1º Grupo A',
    awayDesc: 'Melhor 3º',
    homeSource: { pos: 1, group: 'A' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: [],
  },
  {
    slot: 8,
    homeDesc: '1º Grupo L',
    awayDesc: 'Melhor 3º',
    homeSource: { pos: 1, group: 'L' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: [],
  },
  {
    slot: 9,
    homeDesc: '1º Grupo D',
    awayDesc: 'Melhor 3º',
    homeSource: { pos: 1, group: 'D' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: [],
  },
  {
    slot: 10,
    homeDesc: '1º Grupo G',
    awayDesc: 'Melhor 3º',
    homeSource: { pos: 1, group: 'G' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: [],
  },
  {
    slot: 11,
    homeDesc: '2º Grupo K',
    awayDesc: '2º Grupo L',
    homeSource: { pos: 2, group: 'K' },
    awaySource: { pos: 2, group: 'L' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 12,
    homeDesc: '1º Grupo H',
    awayDesc: '2º Grupo J',
    homeSource: { pos: 1, group: 'H' },
    awaySource: { pos: 2, group: 'J' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 13,
    homeDesc: '1º Grupo B',
    awayDesc: 'Melhor 3º',
    homeSource: { pos: 1, group: 'B' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: [],
  },
  {
    slot: 14,
    homeDesc: '1º Grupo J',
    awayDesc: '2º Grupo H',
    homeSource: { pos: 1, group: 'J' },
    awaySource: { pos: 2, group: 'H' },
    awayIsThird: false,
    thirdGroups: [],
  },
  {
    slot: 15,
    homeDesc: '1º Grupo K',
    awayDesc: 'Melhor 3º',
    homeSource: { pos: 1, group: 'K' },
    awaySource: null,
    awayIsThird: true,
    thirdGroups: [],
  },
  {
    slot: 16,
    homeDesc: '2º Grupo D',
    awayDesc: '2º Grupo G',
    homeSource: { pos: 2, group: 'D' },
    awaySource: { pos: 2, group: 'G' },
    awayIsThird: false,
    thirdGroups: [],
  },
];

// ─── Oitavas de Final — vencedores dos 16-avos (jogos 89-96) ─────────────────
export const R16_BRACKET = [
  { slot: 1, homeFromR32: 2, awayFromR32: 5 },
  { slot: 2, homeFromR32: 1, awayFromR32: 3 },
  { slot: 3, homeFromR32: 4, awayFromR32: 6 },
  { slot: 4, homeFromR32: 7, awayFromR32: 8 },
  { slot: 5, homeFromR32: 11, awayFromR32: 12 },
  { slot: 6, homeFromR32: 9, awayFromR32: 10 },
  { slot: 7, homeFromR32: 14, awayFromR32: 16 },
  { slot: 8, homeFromR32: 13, awayFromR32: 15 },
];

// ─── Quartas de Final (jogos 97-100) ─────────────────────────────────────────
export const QF_BRACKET = [
  { slot: 1, homeFromR16: 1, awayFromR16: 2 },
  { slot: 2, homeFromR16: 5, awayFromR16: 6 },
  { slot: 3, homeFromR16: 3, awayFromR16: 4 },
  { slot: 4, homeFromR16: 7, awayFromR16: 8 },
];

// ─── Semifinais (jogos 101-102) ───────────────────────────────────────────────
export const SF_BRACKET = [
  { slot: 1, homeFromQF: 1, awayFromQF: 2 },
  { slot: 2, homeFromQF: 3, awayFromQF: 4 },
];

// ─── Final (jogo 104) ─────────────────────────────────────────────────────────
export const FINAL_BRACKET = [
  { slot: 1, homeFromSF: 1, awayFromSF: 2 },
];
