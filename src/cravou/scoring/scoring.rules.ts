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
): number {
  const isGroupStage = phase === 'group_stage';

  // Placar exato
  if (actualHome === predictedHome && actualAway === predictedAway) {
    return isGroupStage ? 10 : 15;
  }

  // Resultado correto (grupo) / vencedor correto (mata-mata)
  const actualOutcome = getOutcome(actualHome, actualAway);
  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  if (actualOutcome === predictedOutcome) {
    return isGroupStage ? 5 : 8;
  }

  // Acertou gols de apenas um time
  if (actualHome === predictedHome || actualAway === predictedAway) {
    return 2;
  }

  return 0;
}
