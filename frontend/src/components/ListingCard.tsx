import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import type { ListingSummary } from '../types'
import { cn, formatDate, formatPrice } from '../lib/utils'
import { AuthImage } from './AuthImage'
import { StatusBadge } from './ui'

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const photoUrls = listing.photoIds.map(
    (pid) => `/api/listings/${listing.id}/photos/${pid}/thumb`,
  )
  const [index, setIndex] = useState(0)
  const hasMultiple = photoUrls.length > 1

  const go = (e: MouseEvent, dir: number) => {
    e.preventDefault()
    e.stopPropagation()
    setIndex((i) => (i + dir + photoUrls.length) % photoUrls.length)
  }

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-zinc-800">
        {photoUrls.length > 0 ? (
          <AuthImage
            src={photoUrls[index]}
            className="h-full w-full transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-zinc-600">
            <ImageOff size={32} />
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => go(e, -1)}
              aria-label="Предыдущее фото"
              className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => go(e, 1)}
              aria-label="Следующее фото"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {photoUrls.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index ? 'w-3 bg-white' : 'w-1.5 bg-white/50',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium">{listing.title}</h3>
          <StatusBadge status={listing.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{formatPrice(listing.priceKopecks)}</span>
          {listing.photoCount > 0 && (
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              {listing.photoCount} фото
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 dark:text-zinc-500">
          {formatDate(listing.createdAt)}
        </div>
      </div>
    </Link>
  )
}
