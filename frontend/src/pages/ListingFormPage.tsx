import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mic, Square } from 'lucide-react'
import { api } from '../lib/api'
import { kopecksToRublesInput, parsePrice, rublesInputToKopecks } from '../lib/utils'
import { compressImage } from '../lib/image'
import { useVoice } from '../hooks/useVoice'
import { useMicrophones } from '../hooks/useMicrophones'
import { AutoGrowTextarea, Button, Card, Input, Label, Spinner } from '../components/ui'
import { VoiceWave } from '../components/VoiceWave'
import { PhotoPicker } from '../components/PhotoPicker'
import type { StructuringProgress, TranscriptionProgress } from '../types'

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

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  local: 'Локальный Whisper',
}

const providerLabel = (name: string) => PROVIDER_LABELS[name] ?? (name || 'провайдер')

/** Превращает событие прогресса структуризации в строку для лога на фронте. */
function formatStructuringProgress(event: StructuringProgress): string {
  const label = providerLabel(event.provider)
  switch (event.type) {
    case 'attempt':
      return `Пробую провайдера «${label}»…`
    case 'failure':
      return `Не удалось структурировать через «${label}»: ${event.reason}`
    case 'success':
      return `Провайдер «${label}» успешно разложил ответ`
  }
}

/** Превращает событие прогресса распознавания речи в строку для лога. */
function formatTranscriptionProgress(event: TranscriptionProgress): string {
  const label = providerLabel(event.provider)
  switch (event.type) {
    case 'attempt':
      return `Распознаю через «${label}»…`
    case 'failure':
      return `Не удалось распознать через «${label}»: ${event.reason}`
    case 'success':
      return `Распознано через «${label}»`
  }
}

export function ListingFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const listingId = id ? Number(id) : undefined
  if (id && Number.isNaN(listingId)) {
    navigate('/')
    return null
  }

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => api.getListing(listingId!),
    enabled: editing && !!listingId,
  })

  // Лимит длительности надиктовки приходит с бэкенда (app.voice.max-recording-seconds)
  const { data: appConfig } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.getConfig(),
    staleTime: Infinity,
  })
  const maxRecordingSeconds = appConfig?.maxRecordingSeconds
  const minSpeechLevel = appConfig?.minSpeechLevel
  const fieldDictationEnabled = appConfig?.fieldDictationEnabled ?? true

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [category, setCategory] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [recordingField, setRecordingField] = useState<VoiceField | null>(null)
  const [saveProgress, setSaveProgress] = useState('')
  const [wholeStage, setWholeStage] = useState<'structuring' | null>(null)
  const [structuringLog, setStructuringLog] = useState<string[]>([])
  const [recognizing, setRecognizing] = useState(false)
  const [transcribeLog, setTranscribeLog] = useState<string[]>([])
  const [photoRevision, setPhotoRevision] = useState(0)
  const voiceTargetRef = useRef<VoiceField | null>(null)

  // useMicrophones: безопасно даже если navigator.mediaDevices отсутствует
  const { devices, selectedId, setSelectedId, refresh: refreshMics } = useMicrophones()

  useEffect(() => {
    if (listing) {
      setTitle(listing.title)
      setDescription(listing.description ?? '')
      setPriceInput(kopecksToRublesInput(listing.priceKopecks))
      setCategory(listing.category ?? '')
    }
  }, [listing])

  // Распознавание речи с потоковым прогрессом (какой провайдер, успех/неуспех)
  const processAudio = async (blob: Blob, filename: string) => {
    setTranscribeLog([])
    setRecognizing(true)
    try {
      return await api.transcribeStream(blob, filename, (event) => {
        setTranscribeLog((prev) => [...prev, formatTranscriptionProgress(event)])
      })
    } finally {
      setRecognizing(false)
    }
  }

  const voice = useVoice(
    (text: string) => {
      const field = voiceTargetRef.current
      voiceTargetRef.current = null
      setRecordingField(null)
      if (!text.trim()) {
        setFormError('Речь не распознана — попробуйте ещё раз')
        return
      }
      if (field === 'title') setTitle(text)
      else if (field === 'description') setDescription(text)
      else if (field === 'category') setCategory(text)
      else if (field === 'price') {
        const n = parsePrice(text)
        if (n !== null) setPriceInput(String(n))
        else setFormError('Не удалось распознать цену — введите вручную')
      }
    },
    processAudio,
    maxRecordingSeconds,
    minSpeechLevel,
  )

  const toggleVoice = (field: VoiceField) => {
    if (recordingField === field) {
      voice.stop()
      // После надиктовки можно обновить список микрофонов (появятся названия)
      void refreshMics()
    } else {
      voiceTargetRef.current = field
      setRecordingField(field)
      void voice.start(selectedId || undefined)
    }
  }

  // Надиктовать всё объявление целиком (распознавание + структуризация)
  const wholeVoice = useVoice(
    async (text: string) => {
      setFormError(null)
      if (!text.trim()) {
        setFormError('Речь не распознана — попробуйте ещё раз')
        return
      }
      setStructuringLog([])
      setWholeStage('structuring')
      try {
        const structured = await api.structureTextStream(text, (event) => {
          setStructuringLog((prev) => [...prev, formatStructuringProgress(event)])
        })
        if (structured.title) setTitle(structured.title)
        if (structured.description) setDescription(structured.description)
        if (structured.category) setCategory(structured.category)
        if (typeof structured.price === 'number' && structured.price > 0) {
          setPriceInput(String(structured.price))
        }
      } catch (e) {
        setFormError(e instanceof Error ? e.message : 'Ошибка структуризации')
      } finally {
        setWholeStage(null)
      }
    },
    processAudio,
    maxRecordingSeconds,
    minSpeechLevel,
  )

  const toggleWholeVoice = () => {
    if (wholeVoice.recording) {
      wholeVoice.stop()
    } else {
      void wholeVoice.start(selectedId || undefined)
    }
  }

  const addFiles = async (newFiles: File[]) => {
    const maxNew = 12 - (listing?.photos.length ?? 0) - files.length
    const accepted = newFiles.slice(0, Math.max(0, maxNew))
    if (accepted.length === 0) return
    // Сжимаем на клиенте (теми же параметрами, что и бэкенд) — грузим уже лёгкие файлы
    const maxDimension = appConfig?.imageMaxDimension ?? 1600
    const quality = appConfig?.imageQuality ?? 0.85
    const compressed: File[] = []
    for (const file of accepted) {
      compressed.push(await compressImage(file, maxDimension, quality))
    }
    const next = [...files, ...compressed]
    setFiles(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) => api.deletePhoto(listingId!, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listing', listingId] }),
  })

  const rotateMutation = useMutation({
    mutationFn: (photoId: number) => api.rotatePhoto(listingId!, photoId),
    onSuccess: () => {
      // Меняем ревизию, чтобы AuthImage перезагрузил превью (URL-то не меняется)
      setPhotoRevision((v) => v + 1)
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] })
    },
  })

  const rotateFile = async (index: number) => {
    const file = files[index]
    if (!file) return
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.height
      canvas.height = bitmap.width
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
      bitmap.close()
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('rotate failed'))), 'image/jpeg', 0.9),
      )
      const rotated = new File([blob], file.name || 'photo.jpg', { type: 'image/jpeg' })
      const nextPreviews = [...previews]
      if (nextPreviews[index]) URL.revokeObjectURL(nextPreviews[index])
      nextPreviews[index] = URL.createObjectURL(blob)
      const nextFiles = [...files]
      nextFiles[index] = rotated
      setFiles(nextFiles)
      setPreviews(nextPreviews)
    } catch {
      // ignore
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priceKopecks: rublesInputToKopecks(priceInput),
        category: category.trim() || null,
      }
      setSaveProgress(editing ? 'Сохранение…' : 'Создание объявления…')
      const saved = editing
        ? await api.updateListing(listingId!, payload)
        : await api.createListing(payload)
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          setSaveProgress(`Загрузка фото ${i + 1} из ${files.length}…`)
          await api.addPhoto(saved.id, files[i])
        }
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
    onSettled: () => {
      setSaveProgress('')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!title.trim()) {
      setFormError('Введите название')
      return
    }
    if (!description.trim()) {
      setFormError('Введите описание')
      return
    }
    const kopecks = rublesInputToKopecks(priceInput)
    if (Number.isNaN(kopecks) || kopecks <= 0) {
      setFormError('Укажите корректную цену')
      return
    }
    const total = (listing?.photos.length ?? 0) + files.length
    if (total === 0) {
      setFormError('Добавьте хотя бы одно фото')
      return
    }
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

      <button
        type="button"
        onClick={toggleWholeVoice}
        className={
          wholeVoice.recording
            ? 'flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition active:scale-[0.99] hover:bg-red-500'
            : 'flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition active:scale-[0.99] hover:from-indigo-500 hover:to-violet-500'
        }
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
          {wholeVoice.recording ? <Square size={18} /> : <Mic size={20} />}
        </span>
        {wholeVoice.recording ? 'Остановить' : 'Надиктовать всё объявление'}
      </button>

      {wholeVoice.recording && (
        <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
              <span className="truncate text-sm font-medium">Слушаю… расскажите о товаре</span>
            </div>
            {wholeVoice.remaining != null && (
              <span className="shrink-0 text-sm font-medium tabular-nums text-slate-500 dark:text-zinc-400">
                {wholeVoice.remaining} с
              </span>
            )}
          </div>
          <VoiceWave active readWaveform={wholeVoice.readWaveform} />
        </div>
      )}

      {(recognizing || transcribeLog.length > 0) && (
        <div className="space-y-2 rounded-xl bg-slate-100 px-4 py-3 dark:bg-zinc-800">
          {recognizing && (
            <div className="flex items-center gap-3">
              <Spinner />
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                Распознаю речь…
              </span>
            </div>
          )}
          {transcribeLog.length > 0 && (
            <ul className="ml-7 space-y-1 text-xs text-slate-500 dark:text-zinc-400">
              {transcribeLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(wholeStage === 'structuring' || structuringLog.length > 0) && (
        <div className="space-y-2 rounded-xl bg-slate-100 px-4 py-3 dark:bg-zinc-800">
          {wholeStage === 'structuring' && (
            <div className="flex items-center gap-3">
              <Spinner />
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                Раскладываю по параметрам…
              </span>
            </div>
          )}
          {structuringLog.length > 0 && (
            <ul className="ml-7 space-y-1 text-xs text-slate-500 dark:text-zinc-400">
              {structuringLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Выбор микрофона: показываем только если есть устройства */}
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

      {voice.recording && recordingField && (
        <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
              <span className="truncate text-sm font-medium">
                Запись: {FIELD_LABELS[recordingField]}
              </span>
            </div>
            {voice.remaining != null && (
              <span className="shrink-0 text-sm font-medium tabular-nums text-slate-500 dark:text-zinc-400">
                {voice.remaining} с
              </span>
            )}
          </div>
          <VoiceWave active readWaveform={voice.readWaveform} />
        </div>
      )}

      <Card className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">
            Название <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-start gap-2">
            <AutoGrowTextarea
              id="title"
              rows={1}
              value={title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
              placeholder="Например, iPhone 15 Pro"
            />
            {fieldDictationEnabled && (
              <VoiceButton
                recording={recordingField === 'title'}
                onClick={() => toggleVoice('title')}
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">
            Описание <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-start gap-2">
            <AutoGrowTextarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Состояние, комплектация…"
            />
            {fieldDictationEnabled && (
              <VoiceButton
                recording={recordingField === 'description'}
                onClick={() => toggleVoice('description')}
              />
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="price">
              Цена, ₽ <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="price"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="1500"
              />
              {fieldDictationEnabled && (
                <VoiceButton
                  recording={recordingField === 'price'}
                  onClick={() => toggleVoice('price')}
                />
              )}
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
              {fieldDictationEnabled && (
                <VoiceButton
                  recording={recordingField === 'category'}
                  onClick={() => toggleVoice('category')}
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <Label>
            Фото (до 12) <span className="text-red-500">*</span>
          </Label>
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
          onRotateExisting={(p) => rotateMutation.mutate(p.id)}
          onRemoveFile={removeFile}
          onRotateFile={rotateFile}
          max={12}
          revision={photoRevision}
        />
      </Card>

      {voice.error && <p className="text-sm text-amber-600">{voice.error}</p>}
      {wholeVoice.error && <p className="text-sm text-amber-600">{wholeVoice.error}</p>}
      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
          {saveMutation.isPending ? 'Сохранение…' : editing ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Отмена
        </Button>
      </div>

      {saveMutation.isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl dark:bg-zinc-900">
            <Spinner />
            <div className="text-sm font-medium text-slate-700 dark:text-zinc-200">
              {saveProgress || 'Сохранение…'}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
