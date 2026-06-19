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

    // Mata-mata sem empate → CRAVOU vitória
    if (actualHome !== actualAway) return 15;

    // Mata-mata com empate exato: +2 se acertou classificado, -1 se errou
    const classifiedCorrect =
      predictedPenaltyWinner &&
      actualPenaltyWinner &&
      predictedPenaltyWinner.toLowerCase() === actualPenaltyWinner.toLowerCase();
    return classifiedCorrect ? 17 : 14;
  }

  // ── Resultado correto (vencedor ou empate) ───────────────────
  const actualOutcome = getOutcome(actualHome, actualAway);
  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  if (actualOutcome === predictedOutcome) {
    const base = isGroupStage ? 5 : 8;

    // Empate não-exato no mata-mata: classificado decide bônus/penalização
    if (!isGroupStage && actualOutcome === 'draw') {
      const classifiedCorrect =
        predictedPenaltyWinner &&
        actualPenaltyWinner &&
        predictedPenaltyWinner.toLowerCase() === actualPenaltyWinner.toLowerCase();
      return classifiedCorrect ? base + 2 : base - 1;
    }

    const oneTeamCorrect = actualHome === predictedHome || actualAway === predictedAway;
    const drawBonus = actualOutcome === 'draw' ? 1 : 0; // grupo: +1 por acertar empate
    return base + (oneTeamCorrect ? 2 : 0) + drawBonus;
  }

  // ── Acertou gols de apenas um time ───────────────────────────
  if (actualHome === predictedHome || actualAway === predictedAway) {
    return isGroupStage ? 2 : 3;
  }

  return 0;
}