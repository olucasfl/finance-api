"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStJoseph = buildStJoseph;
function buildStJoseph() {
    const steps = [];
    steps.push({
        type: "prayer",
        title: "Sinal da Santa Cruz"
    });
    steps.push({
        type: "prayer",
        title: "Oferecimento",
        text: `Ofereço esse terço em louvor e glória de Jesus, Maria e José, para que sejam a minha luz, guia, proteção, defesa, amparo e fortaleza em todos os meus trabalhos, alegrias, agonias e tribulações. Pelo Nome de Jesus e pela glória de Maria, imploro de Vós, glorioso São José que alcanceis a graça que desejo (pedir a graça). Advogai a minha causa, falai em meu favor, no céu e na terra, alegrai a minha alma, para honra e gloria de Jesus e Maria.
Amém.`
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
    const misterios = [
        "Primeiro Mistério",
        "Segundo Mistério",
        "Terceiro Mistério",
        "Quarto Mistério",
        "Quinto Mistério"
    ];
    for (let d = 0; d < 5; d++) {
        steps.push({
            type: "mystery",
            title: misterios[d],
            text: `Meu glorioso São José, nas vossas maiores aflições e tribulações não vos valeu o anjo do Senhor? Valei-me, São José!`
        });
        for (let i = 0; i < 10; i++) {
            steps.push({
                type: "prayer",
                title: `São José ${i + 1}/10`,
                text: `São José, valei-me!`
            });
        }
        steps.push({ type: "prayer", title: "Glória ao Pai" });
    }
    return steps;
}
//# sourceMappingURL=StJosephBuilder.js.map