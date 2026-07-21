/**
 * Retorna a data de "hoje" no fuso de Brasília, representada como um Date
 * cujos getters locais (getFullYear/getMonth/getDate) já refletem o dia
 * correto no Brasil — independente do fuso horário em que o servidor roda.
 *
 * Sem isso, `new Date()` num servidor em UTC pode already estar no dia
 * seguinte enquanto ainda é "ontem" no Brasil (ou vice-versa), fazendo
 * o parser de datas e a busca de liturgia mirarem no dia errado.
 */
export function getBrazilToday(): Date {
 const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
 }).formatToParts(new Date())

 const year = Number(parts.find(p => p.type === "year")?.value)
 const month = Number(parts.find(p => p.type === "month")?.value)
 const day = Number(parts.find(p => p.type === "day")?.value)

 return new Date(year, month - 1, day)
}
