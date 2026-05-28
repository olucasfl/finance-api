"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePoints = calculatePoints;
function getOutcome(home, away) {
    if (home > away)
        return 'home';
    if (away > home)
        return 'away';
    return 'draw';
}
function calculatePoints(phase, actualHome, actualAway, predictedHome, predictedAway, actualPenaltyWinner, predictedPenaltyWinner) {
    const isGroupStage = phase === 'group_stage';
    if (actualHome === predictedHome && actualAway === predictedAway) {
        if (isGroupStage)
            return 10;
        if (actualHome !== actualAway)
            return 15;
        if (predictedPenaltyWinner &&
            actualPenaltyWinner &&
            predictedPenaltyWinner.toLowerCase() === actualPenaltyWinner.toLowerCase()) {
            return 15;
        }
        return 8;
    }
    const actualOutcome = getOutcome(actualHome, actualAway);
    const predictedOutcome = getOutcome(predictedHome, predictedAway);
    if (actualOutcome === predictedOutcome) {
        return isGroupStage ? 5 : 8;
    }
    if (actualHome === predictedHome || actualAway === predictedAway) {
        return 2;
    }
    return 0;
}
//# sourceMappingURL=scoring.rules.js.map