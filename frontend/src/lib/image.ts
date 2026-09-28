/**
 * Клиентское сжатие фото перед загрузкой: уменьшает до `maxDimension` по большей
 * стороне и перекодирует в JPEG с качеством `quality`. Учитывает EXIF-ориентацию,
 * поэтому фото с телефона не ложатся на бок.
 *
 * Если декодировать не удалось (например, HEIC в браузере без его поддержки) —
 * возвращает файл как есть, а сжатием займётся бэкенд.
 */
export async function compressImage(
  file: File,
  maxDimension: number,
  quality: number,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  const { width, height } = bitmap
  const scale = Math.min(1, maxDimension / Math.max(width, height))

  // Уже небольшой JPEG — не перекодируем лишний раз
  if (scale === 1 && file.type === 'image/jpeg') {
    bitmap.close()
    return file
  }

  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) return file

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}
