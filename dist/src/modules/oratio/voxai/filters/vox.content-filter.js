"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentFilter = contentFilter;
function contentFilter(message) {
    const forbidden = [
        "horóscopo",
        "astrologia",
        "tarot",
        "magia",
        "feitiço",
        "espiritismo",
        "ocultismo"
    ];
    const text = message.toLowerCase();
    for (const word of forbidden) {
        if (text.includes(word)) {
            return {
                blocked: true,
                message: "Como assistente espiritual católico, não posso orientar sobre esse tema."
            };
        }
    }
    return { blocked: false };
}
//# sourceMappingURL=vox.content-filter.js.map