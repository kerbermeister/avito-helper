import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'

interface CacheEntry {
  revision: number
  url: string
}

const cache = new Map<string, CacheEntry>()

/** Сброс кэша одного изображения (или всего, если src не передан). */
export function invalidateImageCache(src?: string) {
  if (src) {
    const entry = cache.get(src)
    if (entry) URL.revokeObjectURL(entry.url)
    cache.delete(src)
  } else {
    for (const entry of cache.values()) URL.revokeObjectURL(entry.url)
    cache.clear()
  }
}

export function AuthImage({
  src,
  alt,
  className,
  revision = 0,
}: {
  src: string
  alt?: string
  className?: string
  /** Меняйте при изменении картинки на сервере (например, после поворота), чтобы перезагрузить её. */
  revision?: number
}) {
  const [url, setUrl] = useState<string | null>(() => {
    const entry = cache.get(src)
    return entry && entry.revision === revision ? entry.url : null
  })

  useEffect(() => {
    let cancelled = false
    const cached = cache.get(src)
    if (cached && cached.revision === revision) {
      setUrl(cached.url)
      return
    }
    setUrl(null)
    // После поворота URL тот же, а браузер мог закэшировать его «намертво» —
    // поэтому запрашиваем с версионным параметром, чтобы обойти кэш.
    const fetchUrl = revision > 0 ? `${src}${src.includes('?') ? '&' : '?'}v=${revision}` : src
    api
      .getPhotoBlob(fetchUrl)
      .then((blob) => {
        if (cancelled) return
        const objectUrl = URL.createObjectURL(blob)
        const previous = cache.get(src)
        if (previous && previous.revision !== revision) {
          URL.revokeObjectURL(previous.url)
        }
        cache.set(src, { revision, url: objectUrl })
        setUrl(objectUrl)
      })
      .catch(() => {
        // ignore — показываем плейсхолдер
      })
    return () => {
      cancelled = true
    }
  }, [src, revision])

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
