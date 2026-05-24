export function getWeekKey(date: Date): string {

  const firstDay =
    new Date(date.getFullYear(), 0, 1)

  const pastDays = Math.floor(
    (date.getTime() - firstDay.getTime()) / 86400000
  )

  const week = Math.ceil(
    (pastDays + firstDay.getDay() + 1) / 7
  )

  return `${date.getFullYear()}-W${week}`

}

export function getCurrentWeekKey(): string {

  return getWeekKey(new Date())

}