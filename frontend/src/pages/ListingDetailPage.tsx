import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatDate, formatPrice, STATUS_META, STATUS_ORDER } from '../lib/utils'
import type { ListingStatus } from '../types'
import { AuthImage } from '../components/AuthImage'
import { Button, Card, Spinner, StatusBadge } from '../components/ui'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-slate-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">{value}</span>
    </div>
  )
}

export function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchStartX = useRef<number | null>(null)

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.getListing(Number(id)),
  })

  const statusMutation = useMutation({
    mutationFn: (status: ListingStatus) => api.updateStatus(Number(id), status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listing', id] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteListing(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      navigate('/')
    },
  })

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await api.downloadArchive(Number(id))
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setDownloading(false)
    }
  }

  const totalPhotos = listing?.photos.length ?? 0
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const prevPhoto = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + totalPhotos) % totalPhotos))
  }, [totalPhotos])
  const nextPhoto = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % totalPhotos))
  }, [totalPhotos])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowLeft') prevPhoto()
      else if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (error || !listing) {
    return <p className="text-sm text-red-600">Не удалось загрузить объявление</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft size={16} /> Назад
      </button>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
        <StatusBadge status={listing.status} />
      </div>

      {listing.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:opacity-90 dark:ring-zinc-800"
            >
              <AuthImage src={p.url} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}

      <div className="text-3xl font-bold">{formatPrice(listing.priceKopecks)}</div>

      <Card className="divide-y divide-slate-100 dark:divide-zinc-800">
        <DetailRow label="Категория" value={listing.category ?? '—'} />
        <DetailRow label="Дата создания" value={formatDate(listing.createdAt)} />
        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-sm text-slate-500 dark:text-zinc-400">Статус</span>
          <select
            value={listing.status}
            onChange={(e) => statusMutation.mutate(e.target.value as ListingStatus)}
            disabled={statusMutation.isPending}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {listing.description && (
        <Card className="space-y-2 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
            Описание
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
            {listing.description}
          </p>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleDownload} disabled={downloading || listing.photos.length === 0}>
          <Download size={18} />
          {downloading ? 'Скачивание…' : 'Скачать фото'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/listings/${listing.id}/edit`)}>
          <Pencil size={18} /> Изменить
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm('Удалить объявление?')) deleteMutation.mutate()
          }}
          disabled={deleteMutation.isPending}
        >
          <Trash2 size={18} /> Удалить
        </Button>
      </div>

      {lightboxIndex !== null && listing.photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={closeLightbox}>
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {lightboxIndex + 1} / {totalPhotos}
            </span>
            <button
              onClick={closeLightbox}
              className="rounded-full p-2 hover:bg-white/10"
              aria-label="Закрыть"
            >
              <X size={24} />
            </button>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return
              const dx = e.changedTouches[0].clientX - touchStartX.current
              if (dx > 50) prevPhoto()
              else if (dx < -50) nextPhoto()
              touchStartX.current = null
            }}
          >
            <AuthImage
              src={listing.photos[lightboxIndex].url}
              className="max-h-full max-w-full object-contain"
            />
            {totalPhotos > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    prevPhoto()
                  }}
                  className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  aria-label="Предыдущее"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    nextPhoto()
                  }}
                  className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  aria-label="Следующее"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
