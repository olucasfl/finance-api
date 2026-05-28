"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSacredHeart = buildSacredHeart;
function buildSacredHeart() {
    const steps = [];
    steps.push({
        type: "prayer",
        title: "Sinal da Santa Cruz"
    });
    steps.push({ type: "prayer", title: "Credo" });
    steps.push({ type: "prayer", title: "Pai Nosso" });
    for (let i = 0; i < 3; i++) {
        steps.push({
            type: "prayer",
            title: `Ave Maria ${i + 1}/3`
        });
    }
    steps.push({ type: "prayer", title: "Glória ao Pai" });
    for (let d = 1; d <= 5; d++) {
        steps.push({
            type: "prayer",
            title: `${d}ª Dezena`,
            text: `Lembrai-vos, ó misericordiosíssimo Jesus, que sois Pai, bondosíssimo e cheio de ternura para com os vossos filhos. Certo de vosso infinito amor, entrego-me ao Vosso coração, com alegria e doce confiança em minhas súplicas, segundo vossas palavras: "Pedi e recebereis. Buscai e achareis. Batei e abrir-se-vos-á."
Eu bato, procuro e peço esta graça que me é tão necessária (pedir a graça). Tudo para maior glória de Deus e bem de vossos filhos. Amém.`
        });
        for (let i = 0; i < 10; i++) {
            steps.push({
                type: "prayer",
                title: `Sagrado Coração de Jesus ${i + 1}/10`,
                text: `Sagrado Coração de Jesus, eu confio em vós.`
            });
        }
        steps.push({ type: "prayer", title: "Glória ao Pai" });
    }
    steps.push({ type: "prayer", title: "Salve Rainha" });
    return steps;
}
//# sourceMappingURL=sacredHearthBuilder.js.map