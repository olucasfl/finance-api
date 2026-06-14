type Outcome = 'home' | 'away' | 'draw';

function getOutcome(home: number, away: number): Outcome {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

export function calculatePoints(
  phase: string,
  actualHome: number,
  actualAway: number,
  predictedHome: number,
  predictedAway: number,
  actualPenaltyWinner?: string | null,
  predictedPenaltyWinner?: string | null,
): number {
  const isGroupStage = phase === 'group_stage';

  // ── Placar exato ─────────────────────────────────────────────
  if (actualHome === predictedHome && actualAway === predictedAway) {
    if (isGroupStage) return 10;

    // Mata-mata sem empate → CRAVOU sem pênaltis
    if (actualHome !== actualAway) return 15;

    // Mata-mata com empate: classificado nos pênaltis decide se é CRAVOU
    if (
      predictedPenaltyWinner &&
      actualPenaltyWinner &&
      predictedPenaltyWinner.toLowerCase() === actualPenaltyWinner.toLowerCase()
    ) {
      return 15; // CRAVOU: placar exato + classificado correto
    }
    return 8; // Placar certo mas classificado errado ou não previsto
  }

  // ── Resultado correto (vencedor ou empate) ───────────────────
  const actualOutcome = getOutcome(actualHome, actualAway);
  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  if (actualOutcome === predictedOutcome) {
    const base = isGroupStage ? 5 : 8;
    const oneTeamCorrect = actualHome === predictedHome || actualAway === predictedAway;
    return base + (oneTeamCorrect ? 2 : 0);
  }

  // ── Acertou gols de apenas um time ───────────────────────────
  if (actualHome === predictedHome || actualAway === predictedAway) {
    return 2;
  }

  return 0;
}