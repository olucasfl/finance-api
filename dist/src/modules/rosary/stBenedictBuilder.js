"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStBenedict = buildStBenedict;
function buildStBenedict() {
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
    const mysteries = [
        "Primeiro Mistério",
        "Segundo Mistério",
        "Terceiro Mistério",
        "Quarto Mistério",
        "Quinto Mistério",
        "Sexto Mistério"
    ];
    const phrases = [
        "A Cruz sagrada seja minha Luz",
        "Não seja o dragão meu guia",
        "Retira-te Satanás!",
        "Nunca me aconselhes coisas vãs",
        "É mau o que tu me ofereces",
        "Bebe tu mesmo os teus venenos"
    ];
    for (let d = 0; d < 6; d++) {
        steps.push({
            type: "mystery",
            title: mysteries[d],
            text: `São Bento
Rogai por nós!`
        });
        for (let i = 0; i < 10; i++) {
            steps.push({
                type: "prayer",
                title: `São Bento ${i + 1}/10`,
                text: phrases[d]
            });
        }
        steps.push({ type: "prayer", title: "Glória ao Pai" });
    }
    for (let i = 0; i < 3; i++) {
        steps.push({
            type: "prayer",
            title: `São Bento Final ${i + 1}/3`,
            text: `Rogai por nós glorioso Patriarca São Bento, para que sejamos dignos das promessas de Cristo.`
        });
    }
    steps.push({
        type: "prayer",
        title: "Oração Final",
        text: `Ó glorioso Patriarca São Bento, que vos mostrastes sempre compassivo com os necessitados,

fazei que também nós, recorrendo à vossa poderosa intercessão,
obtenhamos auxílio em todas as nossas aflições;

que nas famílias reine a paz e a tranquilidade;
que se afastem de nós todas as desgraças,
tanto corporais como espirituais,
especialmente o mal do pecado.

Alcançai do Senhor a graça que vos suplicamos;

finalmente, vos pedimos que ao término de nossa vida terrestre
possamos ir louvar a Deus convosco no Paraíso.`
    });
    return steps;
}
//# sourceMappingURL=stBenedictBuilder.js.map