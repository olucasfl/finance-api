"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSevenSorrows = buildSevenSorrows;
function buildSevenSorrows() {
    const steps = [];
    steps.push({
        type: "prayer",
        title: "Início",
        text: `D- Em nome do Pai, do Filho e do Espírito Santo.
R- Amém!
D- Nós vos louvamos, Senhor, e vos bendizemos!
R- Porque associastes a Virgem Maria à obra da salvação.
D- Nós contemplamos vossas Dores, ó mãe de Deus!
R- E vos seguimos no caminho da fé!`
    });
    steps.push({
        type: "prayer",
        title: "Oração Inicial",
        text: `Virgem Dolorosíssima, seríamos ingratos se não nos esforçássemos em promover a memória e o culto de vossas Dores particulares graças para uma sincera penitência, oportunos auxílios e socorros em todas as necessidades e perigos. Alcançai-nos Senhora, de Vosso Divino Filho, pelos mérito de Vossas Dores e lágrimas, a graça… (pedir a graça)`
    });
    const dores = [
        {
            title: "1ª Dor – Profecia de Simeão",
            text: `Simeão os abençoou e disse a Maria, sua mãe: Eis que este menino está destinado a ser ocasião de queda e elevação de muitos em Israel e sinal de contradição. Quanto a ti, uma espada te transpassará a alma (Lc 2,34-35).`
        },
        {
            title: "2ª Dor – Fuga para o Egito",
            text: `O anjo do Senhor apareceu em sonho a José e disse: Levanta, toma o menino e a mãe, foge para o Egito e fica lá até que te avise. Pois Herodes vai procurar o menino para matá-lo. Levantando-se, José tomou o menino e a mãe, e partiu para o Egito (Mt 2,13-14).`
        },
        {
            title: "3ª Dor – Maria procura Jesus em Jerusalém",
            text: `Acabados os dias da festa da Páscoa, quando voltaram, o menino Jesus ficou em Jerusalém, sem que os pais o percebessem. Pensando que estivesse na caravana, andaram o caminho de um dia e o procuraram entre parentes e conhecidos. E, não o achando, voltaram a Jerusalém à procura dele (Lc 2,43b-45).`
        },
        {
            title: "4ª Dor – Jesus encontra a Sua Mãe no caminho do Calvário",
            text: `Ao conduzir Jesus, lançaram mão de um certo Simão de Cirene, que vinha do campo, e o encarregaram de levar a cruz atrás de Jesus. Seguia-o grande multidão de povo e de mulheres que batiam no peito e o lamentavam (Lc 23,26-27).`
        },
        {
            title: "5ª Dor – Maria ao pé da Cruz de Jesus",
            text: `Junto à cruz de Jesus estavam de pé sua Mãe, a irmã de sua Mãe, Maria de Cléofas, e Maria Madalena. Vendo a Mãe e, perto dela, o discípulo a quem amava, disse Jesus para a mãe: Mulher, eis aí o teu filho! Depois disse para o discípulo: Eis aí a tua Mãe! (Jo 19,15-27a).`
        },
        {
            title: "6ª Dor – Maria recebe Jesus descido da Cruz",
            text: `Chegada a tarde, porque era o dia da Preparação, isto é, a véspera de sábado, veio José de Arimatéia, entrou decidido na casa de Pilatos e pediu o corpo de Jesus. Pilatos, então, deu o cadáver a José, que retirou o corpo da cruz (Mc 15,42).`
        },
        {
            title: "7ª Dor – Maria deposita Jesus no Sepulcro",
            text: `Os discípulos tiraram o corpo de Jesus e envolveram em faixas de linho com aromas, conforme é o costume de sepultar dos judeus. Havia perto do local, onde fora crucificado, um jardim, e no jardim um sepulcro novo onde ninguém ainda fora depositado. Foi ali que puseram Jesus (Jo 19,40-42a).`
        }
    ];
    dores.forEach((dor) => {
        steps.push({
            type: "mystery",
            title: dor.title,
            text: dor.text
        });
        steps.push({ type: "prayer", title: "Pai Nosso" });
        for (let i = 0; i < 7; i++) {
            steps.push({
                type: "prayer",
                title: `Ave Maria ${i + 1}/7`
            });
        }
    });
    steps.push({
        type: "prayer",
        title: "Oração Final",
        text: `Infinitas graças vos damos, ó Soberana Rainha, pelos benefícios que todos os dias recebemos de vossas mãos liberais. Dignai-vos, agora e para sempre tomar-nos debaixo do vosso poderoso amparo e para mais vos obrigar, vos saudamos com uma Salve Rainha:`
    });
    steps.push({
        type: "prayer",
        title: "Salve Rainha"
    });
    return steps;
}
//# sourceMappingURL=sevenSorrowsBuilder.js.map