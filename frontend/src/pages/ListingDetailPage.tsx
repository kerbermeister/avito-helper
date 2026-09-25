import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { formatPrice, STATUS_META, STATUS_ORDER } from '../lib/utils'
import type { ListingStatus } from '../types'
import { AuthImage } from '../components/AuthImage'
import { Button, Card, Spinner, StatusBadge } from '../components/ui'

export function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState(false)

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
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft size={16} /> Назад
      </button>

      {listing.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.photos.map((p) => (
            <div
              key={p.id}
              className="aspect-square overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800"
            >
              <AuthImage src={p.url} className="h-full w-full" />
            </div>
          ))}
        </div>
      )}

      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold">{listing.title}</h1>
          <StatusBadge status={listing.status} />
        </div>

        <div className="text-2xl font-bold">{formatPrice(listing.priceKopecks)}</div>

        {listing.category && (
          <div className="text-sm text-slate-500 dark:text-zinc-400">
            Категория: {listing.category}
          </div>
        )}

        {listing.description && (
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-zinc-300">
            {listing.description}
          </p>
        )}

        <div className="space-y-1.5 pt-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
            Статус
          </label>
          <select
            value={listing.status}
            onChange={(e) => statusMutation.mutate(e.target.value as ListingStatus)}
            disabled={statusMutation.isPending}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </Card>

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
    </div>
  )
}
