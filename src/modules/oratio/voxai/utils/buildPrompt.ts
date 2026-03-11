export function buildPrompt(
 systemPrompt:string,
 history:{role:string,content:string}[],
 message:string
){

 const historyText = history
  .map(m => `${m.role === "assistant" ? "Vox" : "Usuário"}: ${m.content}`)
  .join("\n")

 const prompt = `
${systemPrompt}

Histórico da conversa:
${historyText}

Usuário: ${message}

Vox:
`

 return prompt

}