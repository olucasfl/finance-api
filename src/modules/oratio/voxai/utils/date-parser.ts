import { getBrazilToday } from "./brazil-date"

export function parseNaturalDate(message: string): Date | null {
  const text = message.toLowerCase()
  const today = getBrazilToday()

  const clone = (d: Date) => new Date(d)

  const normalize = (d: Date) => {
    const n = new Date(d)
    n.setHours(0, 0, 0, 0)
    return n
  }

  /* =========================
     RELATIVOS SIMPLES
  ========================= */

  if (text.includes("hoje")) return normalize(today)

  if (text.includes("ontem")) {
    const d = clone(today)
    d.setDate(d.getDate() - 1)
    return normalize(d)
  }

  if (text.includes("anteontem")) {
    const d = clone(today)
    d.setDate(d.getDate() - 2)
    return normalize(d)
  }

  if (text.includes("amanhã") || text.includes("amanha")) {
    const d = clone(today)
    d.setDate(d.getDate() + 1)
    return normalize(d)
  }

  /* =========================
     HÁ X DIAS / SEMANAS
  ========================= */

  const pastDays = text.match(/há (\d+) dias?/)
  if (pastDays) {
    const d = clone(today)
    d.setDate(d.getDate() - Number(pastDays[1]))
    return normalize(d)
  }

  const pastWeeks = text.match(/há (\d+) semanas?/)
  if (pastWeeks) {
    const d = clone(today)
    d.setDate(d.getDate() - Number(pastWeeks[1]) * 7)
    return normalize(d)
  }

  /* =========================
     DAQUI X DIAS / SEMANAS
  ========================= */

  const futureDays = text.match(/daqui (\d+) dias?/)
  if (futureDays) {
    const d = clone(today)
    d.setDate(d.getDate() + Number(futureDays[1]))
    return normalize(d)
  }

  const futureWeeks = text.match(/daqui (\d+) semanas?/)
  if (futureWeeks) {
    const d = clone(today)
    d.setDate(d.getDate() + Number(futureWeeks[1]) * 7)
    return normalize(d)
  }

  /* =========================
     SEMANA
  ========================= */

  if (text.includes("semana passada")) {
    const d = clone(today)
    d.setDate(d.getDate() - 7)
    return normalize(d)
  }

  if (text.includes("semana que vem") || text.includes("próxima semana")) {
    const d = clone(today)
    d.setDate(d.getDate() + 7)
    return normalize(d)
  }

  /* =========================
     DIAS DA SEMANA
  ========================= */

  const weekDays: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    terça: 2,
    terca: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sábado: 6,
    sabado: 6
  }

  for (const [name, index] of Object.entries(weekDays)) {

    // passada
    if (text.includes(name + " passada")) {
      const d = clone(today)
      const current = d.getDay()
      const diff = (current - index + 7) % 7 || 7
      d.setDate(d.getDate() - diff)
      return normalize(d)
    }

    // próxima
    if (text.includes(name + " que vem") || text.includes("próxima " + name)) {
      const d = clone(today)
      const current = d.getDay()
      const diff = (index - current + 7) % 7 || 7
      d.setDate(d.getDate() + diff)
      return normalize(d)
    }
  }

  /* =========================
     DOMINGOS ESPECIAIS
  ========================= */

  if (text.includes("domingo passado")) {
    const d = clone(today)
    const day = d.getDay()
    const diff = day === 0 ? 7 : day
    d.setDate(d.getDate() - diff)
    return normalize(d)
  }

  if (text.includes("domingo retrasado")) {
    const d = clone(today)
    const day = d.getDay()
    const diff = day === 0 ? 14 : day + 7
    d.setDate(d.getDate() - diff)
    return normalize(d)
  }

  /* =========================
     DATAS NUMÉRICAS
  ========================= */

  const numeric = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = Number(numeric[2]) - 1
    const year = numeric[3] ? Number(numeric[3]) : today.getFullYear()

    return normalize(new Date(year, month, day))
  }

  /* =========================
     DATAS POR TEXTO
  ========================= */

  const months: Record<string, number> = {
    janeiro: 0,
    fevereiro: 1,
    março: 2,
    marco: 2,
    abril: 3,
    maio: 4,
    junho: 5,
    julho: 6,
    agosto: 7,
    setembro: 8,
    outubro: 9,
    novembro: 10,
    dezembro: 11
  }

  const dateText = text.match(/(\d{1,2}) de ([a-zçã]+)(?: de (\d{4}))?/)

  if (dateText) {
    const day = Number(dateText[1])
    const monthName = dateText[2]
    const year = dateText[3] ? Number(dateText[3]) : today.getFullYear()

    if (months[monthName] !== undefined) {
      return normalize(new Date(year, months[monthName], day))
    }
  }

  return null
}