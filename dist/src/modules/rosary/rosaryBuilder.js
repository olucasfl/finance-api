"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRosary = buildRosary;
const rosaryMysteries_1 = require("./rosaryMysteries");
function buildRosary(type) {
    const mysteries = rosaryMysteries_1.ROSARY_MYSTERIES[type];
    const steps = [];
    steps.push({ type: "prayer", title: "Sinal da Santa Cruz" });
    steps.push({ type: "prayer", title: "Credo" });
    steps.push({ type: "prayer", title: "Pai Nosso" });
    for (let i = 0; i < 3; i++) {
        steps.push({ type: "prayer", title: "Ave Maria" });
    }
    steps.push({ type: "prayer", title: "Glória ao Pai" });
    steps.push({ type: "prayer", title: "Jaculatória de Fátima" });
    mysteries.forEach((mystery, index) => {
        steps.push({
            type: "mystery",
            title: `${index + 1}º Mistério - ${mystery.title}`,
            text: mystery.meditation
        });
        steps.push({ type: "prayer", title: "Pai Nosso" });
        for (let i = 0; i < 10; i++) {
            steps.push({
                type: "prayer",
                title: `Ave Maria ${i + 1}/10`
            });
        }
        steps.push({ type: "prayer", title: "Glória ao Pai" });
        steps.push({ type: "prayer", title: "Jaculatória de Fátima" });
    });
    steps.push({ type: "prayer", title: "Salve Rainha" });
    return steps;
}
//# sourceMappingURL=rosaryBuilder.js.map