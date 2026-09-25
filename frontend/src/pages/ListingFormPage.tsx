import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mic, Square } from 'lucide-react'
import { api } from '../lib/api'
import { cn, kopecksToRublesInput, parsePrice, rublesInputToKopecks } from '../lib/utils'
import { useVoice } from '../hooks/useVoice'
import { useMicrophones } from '../hooks/useMicrophones'
import { Button, Card, Input, Label, Spinner, Textarea } from '../components/ui'
import { PhotoPicker } from '../components/PhotoPicker'

type VoiceField = 'title' | 'description' | 'price' | 'category'

function VoiceButton({
  recording,
  onClick,
}: {
  recording: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        recording
          ? 'shrink-0 rounded-xl bg-red-100 p-2.5 text-red-600 dark:bg-red-500/20 dark:text-red-400'
          : 'shrink-0 rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
      }
      aria-label="Надиктовать"
    >
      {recording ? <Square size={18} /> : <Mic size={18} />}
    </button>
  )
}

const FIELD_LABELS: Record<VoiceField, string> = {
  title: 'название',
  description: 'описание',
  price: 'цена',
  category: 'категория',
}

function VoiceMeter({ level }: { level: number }) {
  const segments = 24
  const active = Math.round(level * segments)
  return (
    <div className="flex flex-1 items-end gap-0.5">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full transition-colors duration-75',
            i < active ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-zinc-700',
          )}
          style={{ height: `${8 + (i / segments) * 14}px` }}
        />
      ))}
    </div>
  )
}

export function ListingFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.getListing(Number(id)),
    enabled: editing,
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [category, setCategory] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [recordingField, setRecordingField] = useState<VoiceField | null>(null)
  const voiceTargetRef = useRef<VoiceField | null>(null)

  const { devices, selectedId, setSelectedId } = useMicrophones()

  useEffect(() => {
    if (listing) {
      setTitle(listing.title)
      setDescription(listing.description ?? '')
      setPriceInput(kopecksToRublesInput(listing.priceKopecks))
      setCategory(listing.category ?? '')
    }
  }, [listing])

  const voice = useVoice((text) => {
    const field = voiceTargetRef.current
    if (field === 'title') setTitle(text)
    else if (field === 'description') setDescription(text)
    else if (field === 'category') setCategory(text)
    else if (field === 'price') {
      const n = parsePrice(text)
      if (n !== null) setPriceInput(String(n))
      else setFormError('Не удалось распознать цену — введите вручную')
    }
    voiceTargetRef.current = null
    setRecordingField(null)
  })

  const toggleVoice = (field: VoiceField) => {
    if (recordingField === field) {
      voice.stop()
    } else {
      voiceTargetRef.current = field
      setRecordingField(field)
      void voice.start(selectedId || undefined)
    }
  }

  const addFiles = (newFiles: File[]) => {
    const maxNew = 12 - (listing?.photos.length ?? 0) - files.length
    const accepted = newFiles.slice(0, Math.max(0, maxNew))
    if (accepted.length === 0) return
    const next = [...files, ...accepted]
    setFiles(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) => api.deletePhoto(Number(id), photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listing', id] }),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priceKopecks: rublesInputToKopecks(priceInput),
        category: category.trim() || null,
      }
      const saved = editing
        ? await api.updateListing(Number(id), payload)
        : await api.createListing(payload)
      for (const file of files) {
        await api.addPhoto(saved.id, file)
      }
      return saved
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['listing', String(saved.id)] })
      navigate(`/listings/${saved.id}`)
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!title.trim()) {
      setFormError('Введите название')
      return
    }
    const kopecks = rublesInputToKopecks(priceInput)
    if (Number.isNaN(kopecks) || kopecks <= 0) {
      setFormError('Укажите корректную цену')
      return
    }
    const total = (listing?.photos.length ?? 0) + files.length
    if (total > 12) {
      setFormError('Не больше 12 фото')
      return
    }
    saveMutation.mutate()
  }

  if (editing && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">
        {editing ? 'Редактировать объявление' : 'Новое объявление'}
      </h1>

      {devices.length >= 2 && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
          <Mic size={16} />
          <span>Микрофон:</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">По умолчанию</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {recordingField && (
        <div className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="shrink-0 text-sm font-medium">
            Запись: {FIELD_LABELS[recordingField]}
          </span>
          <VoiceMeter level={voice.level} />
        </div>
      )}

      <Card className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Название</Label>
          <div className="flex gap-2">
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, iPhone 15 Pro"
            />
            <VoiceButton
              recording={recordingField === 'title'}
              onClick={() => toggleVoice('title')}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Описание</Label>
          <div className="flex items-start gap-2">
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Состояние, комплектация…"
            />
            <VoiceButton
              recording={recordingField === 'description'}
              onClick={() => toggleVoice('description')}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="price">Цена, ₽</Label>
            <div className="flex gap-2">
              <Input
                id="price"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="1500"
              />
              <VoiceButton
                recording={recordingField === 'price'}
                onClick={() => toggleVoice('price')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Категория (необязательно)</Label>
            <div className="flex gap-2">
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Электроника"
              />
              <VoiceButton
                recording={recordingField === 'category'}
                onClick={() => toggleVoice('category')}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <Label>Фото (до 12)</Label>
          <span className="text-xs text-slate-400">
            {((listing?.photos.length ?? 0) + files.length)} / 12
          </span>
        </div>
        <PhotoPicker
          existing={listing?.photos ?? []}
          files={files}
          previews={previews}
          onAdd={addFiles}
          onRemoveExisting={(p) => deletePhotoMutation.mutate(p.id)}
          onRemoveFile={removeFile}
          max={12}
        />
      </Card>

      {voice.error && <p className="text-sm text-amber-600">{voice.error}</p>}
      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
          {saveMutation.isPending ? 'Сохранение…' : editing ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
