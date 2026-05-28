"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDivineMercy = buildDivineMercy;
function buildDivineMercy() {
    const steps = [];
    steps.push({
        type: "prayer",
        title: "Sinal da Cruz",
        text: `Pelo sinal da Santa Cruz, livrai-nos, Deus, Nosso Senhor, dos nossos inimigos.
Em nome do Pai e do Filho e do Espírito Santo. Amém.`
    });
    steps.push({ type: "prayer", title: "Pai Nosso" });
    steps.push({ type: "prayer", title: "Ave Maria" });
    steps.push({ type: "prayer", title: "Credo" });
    for (let d = 1; d <= 5; d++) {
        steps.push({
            type: "prayer",
            title: `${d}ª Dezena`,
            text: `Eterno Pai, eu Vos ofereço o Corpo e Sangue, Alma e Divindade de Vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e do mundo inteiro.`
        });
        for (let i = 0; i < 10; i++) {
            steps.push({
                type: "prayer",
                title: "Pela Sua dolorosa Paixão",
                text: `Pela Sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.`
            });
        }
    }
    for (let i = 0; i < 3; i++) {
        steps.push({
            type: "prayer",
            title: `Deus Santo ${i + 1}/3`,
            text: `Deus Santo, Deus Forte, Deus Imortal, tende piedade de nós e do mundo inteiro.`
        });
    }
    steps.push({
        type: "prayer",
        title: "Oração Final",
        text: `Ó Sangue e Água que jorraste do coração de Jesus como fonte de misericórdia para nós, nós confiamos em vós.`
    });
    return steps;
}
//# sourceMappingURL=divineMercyBuilder.js.map