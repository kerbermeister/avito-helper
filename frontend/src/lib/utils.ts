import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ListingStatus } from '../types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Цена одним числом без форматирования: 250000 -> "2500", 250050 -> "2500.5". */
export function priceToPlainNumber(kopecks: number): string {
  return String(kopecks / 100)
}

export function formatPrice(kopecks: number): string {
  const rubles = kopecks / 100
  const hasKopecks = kopecks % 100 !== 0
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: hasKopecks ? 2 : 0,
    maximumFractionDigits: hasKopecks ? 2 : 0,
  }).format(rubles)
  return `${formatted} ₽`
}

export const STATUS_ORDER: ListingStatus[] = [
  'DRAFT',
  'READY',
  'PUBLISHED',
  'SOLD',
  'ARCHIVED',
  'CANCELLED',
]

export const STATUS_META: Record<ListingStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Черновик',
    className: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
  },
  READY: {
    label: 'Готово',
    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  },
  PUBLISHED: {
    label: 'Размещено',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  SOLD: {
    label: 'Продано',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  ARCHIVED: {
    label: 'Архив',
    className: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
  CANCELLED: {
    label: 'Отменено',
    className: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  },
}

/** Достаёт первое число из текста (для надиктованной цены), иначе null. */
export function extractNumber(text: string): number | null {
  const match = text.replace(/\u00a0/g, ' ').match(/(\d{1,3}(?:[ \u00a0.]?\d{3})*(?:[.,]\d+)?)/)
  if (!match) return null
  const normalized = match[0].replace(/[\s\u00a0]/g, '').replace(',', '.')
  const value = Number.parseFloat(normalized)
  return Number.isNaN(value) ? null : value
}

/** "7500000" -> "75 000" (рубли из копеек, для поля ввода). */
export function kopecksToRublesInput(kopecks: number): string {
  const rubles = kopecks / 100
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rubles)
}

/** Строку рублей ("1 500,50") -> копейки (150050). */
export function rublesInputToKopecks(input: string): number {
  const normalized = input.replace(/[\s\u00a0]/g, '').replace(',', '.')
  return Math.round(Number.parseFloat(normalized) * 100)
}

const RU_UNITS: Record<string, number> = {
  ноль: 0, нуль: 0,
  один: 1, одна: 1, одно: 1, единица: 1,
  два: 2, две: 2, двое: 2,
  три: 3, трое: 3,
  четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9,
  десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13,
  четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17,
  восемнадцать: 18, девятнадцать: 19,
  двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60,
  семьдесят: 70, восемьдесят: 80, девяносто: 90,
  сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500,
  шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900,
  полтора: 1.5, полторы: 1.5,
}

const RU_SCALES: Record<string, number> = {
  тысяча: 1_000, тысячи: 1_000, тысяч: 1_000,
  миллион: 1_000_000, миллиона: 1_000_000, миллионов: 1_000_000,
  миллиард: 1_000_000_000, миллиарда: 1_000_000_000, миллиардов: 1_000_000_000,
}

/** Парсит число из русских слов-числительных: «две тысячи» → 2000. */
export function parseRuNumber(text: string): number | null {
  const normalized = text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s.,-]/g, ' ')
  const tokens = normalized.split(/[\s-]+/).filter(Boolean)

  let total = 0
  let current = 0
  let matched = false

  for (const token of tokens) {
    if (token in RU_UNITS) {
      current += RU_UNITS[token]
      matched = true
    } else if (token in RU_SCALES) {
      total += (current || 1) * RU_SCALES[token]
      current = 0
      matched = true
    } else {
      const num = Number.parseFloat(token.replace(',', '.'))
      if (!Number.isNaN(num)) {
        current += num
        matched = true
      }
    }
  }

  total += current
  return matched && total > 0 ? Math.round(total) : null
}

/** Распознаёт цену из надиктованного текста: сначала слова, потом цифры. */
export function parsePrice(text: string): number | null {
  return parseRuNumber(text) ?? extractNumber(text)
}
