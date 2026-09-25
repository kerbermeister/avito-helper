import { useRef, useState } from 'react'

/**
 * Кнопка копирования в буфер обмена.
 * Безопасна: в HTTP-контексте (без HTTPS) navigator.clipboard может быть
 * недоступен — тогда просто ничего не происходит, без ошибки.
 */
export function CopyButton({
  text,
  label = 'Копировать',
  iconOnly = false,
  className,
}: {
  text: string
  label?: string
  iconOnly?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  const copy = async () => {
    if (!navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ' +
        (className ?? '')
      }
      aria-label="Копировать"
    >
      {copied ? (
        <span className="h-3.5 w-3.5 text-emerald-500">✓</span>
      ) : (
        <span className="h-3.5 w-3.5">📋</span>
      )}
      {!iconOnly && (copied ? 'Скопировано' : label)}
    </button>
  )
}
