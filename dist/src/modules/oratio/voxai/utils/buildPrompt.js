"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrompt = buildPrompt;
function buildPrompt(systemPrompt, history, message) {
    const historyText = history
        .map(m => `${m.role === "assistant" ? "Vox" : "Usuário"}: ${m.content}`)
        .join("\n");
    const prompt = `
${systemPrompt}

Histórico da conversa:
${historyText}

Usuário: ${message}

Vox:
`;
    return prompt;
}
//# sourceMappingURL=buildPrompt.js.map