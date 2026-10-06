import type { Tender } from './types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDisplayDate(date: Date | string) {
  if (typeof date === 'string') {
    const [y, m, d] = date.split('-').map(Number)
    return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`
  }
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDeadline(tender: Tender) {
  const time = /[T\s](\d{2}:\d{2})/.exec(tender.submission_deadline)
  return `${formatDisplayDate(tender.deadlineDate)}${time ? `, ${time[1]}` : ''}`
}
