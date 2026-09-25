import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import type { ListingSummary } from '../types'
import { formatDate, formatPrice } from '../lib/utils'
import { AuthImage } from './AuthImage'
import { StatusBadge } from './ui'

export function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-zinc-800">
        {listing.coverPhotoId ? (
          <AuthImage
            src={`/api/listings/${listing.id}/photos/${listing.coverPhotoId}`}
            className="h-full w-full transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-zinc-600">
            <ImageOff size={32} />
          </div>
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
