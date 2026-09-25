import { useRef, type ChangeEvent } from 'react'
import { Camera, Images, RotateCw, X } from 'lucide-react'
import type { PhotoDto } from '../types'
import { AuthImage } from './AuthImage'

interface PhotoPickerProps {
  existing: PhotoDto[]
  files: File[]
  previews: string[]
  onAdd: (files: File[]) => void
  onRemoveExisting: (photo: PhotoDto) => void
  onRotateExisting: (photo: PhotoDto) => void
  onRemoveFile: (index: number) => void
  onRotateFile: (index: number) => void
  max: number
}

export function PhotoPicker({
  existing,
  files,
  previews,
  onAdd,
  onRemoveExisting,
  onRotateExisting,
  onRemoveFile,
  onRotateFile,
  max,
}: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const remaining = max - existing.length - files.length

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    onAdd(selected.slice(0, Math.max(0, remaining)))
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {existing.map((p) => (
          <div
            key={p.id}
            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-zinc-800 dark:ring-zinc-700"
          >
            <AuthImage src={p.thumbUrl} className="h-full w-full" />
            <button
              type="button"
              onClick={() => onRemoveExisting(p)}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              aria-label="Удалить"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRotateExisting(p)}
              className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              aria-label="Повернуть"
            >
              <RotateCw size={14} />
            </button>
          </div>
        ))}
        {files.map((_, i) => (
          <div
            key={`new-${i}`}
            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-zinc-800 dark:ring-zinc-700"
          >
            <img src={previews[i]} className="h-full w-full object-cover" alt="" />
            <button
              type="button"
              onClick={() => onRemoveFile(i)}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              aria-label="Удалить"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRotateFile(i)}
              className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              aria-label="Повернуть"
            >
              <RotateCw size={14} />
            </button>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Camera size={18} /> Сделать фото
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Images size={18} /> Из галереи
          </button>
          <span className="text-xs text-slate-400">
            осталось {remaining} из {max}
          </span>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
