import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'

const cache = new Map<string, string>()

/** Сброс кэша одного изображения (или всего, если src не передан). */
export function invalidateImageCache(src?: string) {
  if (src) {
    const url = cache.get(src)
    if (url) URL.revokeObjectURL(url)
    cache.delete(src)
  } else {
    for (const url of cache.values()) URL.revokeObjectURL(url)
    cache.clear()
  }
}

export function AuthImage({
  src,
  alt,
  className,
}: {
  src: string
  alt?: string
  className?: string
}) {
  const [url, setUrl] = useState<string | null>(() => cache.get(src) ?? null)

  useEffect(() => {
    let cancelled = false
    const cached = cache.get(src)
    if (cached) {
      setUrl(cached)
      return
    }
    setUrl(null)
    api
      .getPhotoBlob(src)
      .then((blob) => {
        if (cancelled) return
        const objectUrl = URL.createObjectURL(blob)
        cache.set(src, objectUrl)
        setUrl(objectUrl)
      })
      .catch(() => {
        // ignore — показываем плейсхолдер
      })
    return () => {
      cancelled = true
    }
  }, [src])

  if (!url) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-slate-100 dark:bg-zinc-800',
          className,
        )}
      >
        <span className="text-xs text-slate-400 dark:text-zinc-600">…</span>
      </div>
    )
  }

  return <img src={url} alt={alt ?? ''} className={cn('object-cover', className)} />
}
