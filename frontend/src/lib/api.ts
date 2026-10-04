import type {
  AppConfig,
  AuthResponse,
  Listing,
  ListingPayload,
  ListingStatus,
  ListingSummary,
  PhotoDto,
  StructuredListing,
  StructuringProgress,
  TranscriptionProgress,
} from '../types'

import { safeGetItem, safeSetItem, safeRemoveItem } from './storage'

const TOKEN_KEY = 'avito_token'

export function getToken(): string | null {
  return safeGetItem(TOKEN_KEY)
}

export function saveToken(token: string): void {
  safeSetItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  safeRemoveItem(TOKEN_KEY)
}

/**
 * Проверяет, не истёк ли JWT-токен, декодируя payload без проверки подписи.
 * Возвращает true, если токен отсутствует, не является JWT или exp < now.
 */
export function isTokenExpired(token?: string | null): boolean {
  const t = token ?? getToken()
  if (!t) return true
  try {
    const parts = t.split('.')
    if (parts.length !== 3) return true
    // JWT использует base64url, а не стандартный base64 — конвертируем
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    if (typeof payload.exp !== 'number') return false
    // Небольшой запас (10 сек) на случай рассинхронизации часов
    return payload.exp * 1000 < Date.now() - 10_000
  } catch {
    // Если не можем декодировать — не блокируем запрос, сервер сам скажет 401
    return false
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`/api${path}`, { ...options, headers })

  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('avito:unauthorized'))
  }
  if (!res.ok) {
    let message = `Ошибка ${res.status}`
    try {
      const data = (await res.json()) as { message?: string }
      if (data.message) message = data.message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Кидает ошибку с сообщением из ответа, если статус не 2xx. */
async function throwIfNotOk(res: Response): Promise<void> {
  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('avito:unauthorized'))
  }
  if (!res.ok) {
    let message = `Ошибка ${res.status}`
    try {
      const data = (await res.json()) as { message?: string }
      if (data.message) message = data.message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
}

/** Читает SSE-поток ответа и вызывает onEvent для каждого события. */
async function streamSse(
  res: Response,
  onEvent: (event: string, data: Record<string, unknown>) => void,
): Promise<void> {
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const handleBlock = (block: string) => {
    let eventName = 'message'
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
    }
    if (dataLines.length === 0) return
    try {
      onEvent(eventName, JSON.parse(dataLines.join('\n')) as Record<string, unknown>)
    } catch {
      // ignore malformed chunk
    }
  }
  const flush = (text: string) => {
    buffer += text
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      handleBlock(buffer.slice(0, idx))
      buffer = buffer.slice(idx + 2)
    }
  }
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    flush(decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n'))
  }
  flush(decoder.decode())
  if (buffer.trim().length > 0) handleBlock(buffer)
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  listListings() {
    return request<ListingSummary[]>('/listings')
  },

  getListing(id: number) {
    return request<Listing>(`/listings/${id}`)
  },

  getConfig() {
    return request<AppConfig>('/config')
  },

  createListing(payload: ListingPayload) {
    return request<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateListing(id: number, payload: ListingPayload) {
    return request<Listing>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  updateStatus(id: number, status: ListingStatus) {
    return request<Listing>(`/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  deleteListing(id: number) {
    return request<void>(`/listings/${id}`, { method: 'DELETE' })
  },

  addPhoto(listingId: number, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    return request<PhotoDto>(`/listings/${listingId}/photos`, {
      method: 'POST',
      body: fd,
    })
  },

  deletePhoto(listingId: number, photoId: number) {
    return request<void>(`/listings/${listingId}/photos/${photoId}`, {
      method: 'DELETE',
    })
  },

  rotatePhoto(listingId: number, photoId: number) {
    return request<PhotoDto>(`/listings/${listingId}/photos/${photoId}/rotate`, {
      method: 'POST',
    })
  },

  transcribe(blob: Blob, filename: string) {
    const fd = new FormData()
    fd.append('file', blob, filename)
    return request<{ text: string }>('/transcribe', { method: 'POST', body: fd })
  },

  structureText(text: string) {
    return request<StructuredListing>('/listings/structure', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  },

  /**
   * Структуризация с потоковым отчётом о прогрессе (SSE поверх fetch).
   * `onProgress` вызывается по мере обработки провайдеров, а результатом
   * промиса становится разложенное объявление.
   */
  async structureTextStream(
    text: string,
    onProgress: (event: StructuringProgress) => void,
  ): Promise<StructuredListing> {
    const token = getToken()
    const res = await fetch('/api/listings/structure/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    })
    await throwIfNotOk(res)

    const state: { result: StructuredListing | null; error: string | null } = {
      result: null,
      error: null,
    }
    await streamSse(res, (event, data) => {
      switch (event) {
        case 'attempt':
          onProgress({ type: 'attempt', provider: String(data.provider ?? '') })
          break
        case 'failure':
          onProgress({
            type: 'failure',
            provider: String(data.provider ?? ''),
            reason: String(data.reason ?? ''),
          })
          break
        case 'success':
          onProgress({ type: 'success', provider: String(data.provider ?? '') })
          break
        case 'result':
          state.result = data as unknown as StructuredListing
          break
        case 'error':
          state.error = String(data.message ?? 'Ошибка структуризации')
          break
      }
    })

    if (state.result) return state.result
    throw new Error(state.error ?? 'Не удалось структурировать объявление')
  },

  /**
   * Распознавание речи с потоковым отчётом о прогрессе (SSE поверх fetch).
   * `onProgress` вызывается по мере обработки провайдеров, а результатом
   * промиса становится распознанный текст.
   */
  async transcribeStream(
    blob: Blob,
    filename: string,
    onProgress: (event: TranscriptionProgress) => void,
  ): Promise<string> {
    const token = getToken()
    const fd = new FormData()
    fd.append('file', blob, filename)
    const res = await fetch('/api/transcribe/stream', {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: fd,
    })
    await throwIfNotOk(res)

    const state: { text: string | null; error: string | null } = { text: null, error: null }
    await streamSse(res, (event, data) => {
      switch (event) {
        case 'attempt':
          onProgress({ type: 'attempt', provider: String(data.provider ?? '') })
          break
        case 'failure':
          onProgress({
            type: 'failure',
            provider: String(data.provider ?? ''),
            reason: String(data.reason ?? ''),
          })
          break
        case 'success':
          onProgress({ type: 'success', provider: String(data.provider ?? '') })
          break
        case 'result':
          state.text = String(data.text ?? '')
          break
        case 'error':
          state.error = String(data.message ?? 'Ошибка распознавания')
          break
      }
    })

    if (state.text !== null) return state.text
    throw new Error(state.error ?? 'Не удалось распознать речь')
  },

  async downloadArchive(listingId: number): Promise<void> {
    const token = getToken()
    const res = await fetch(`/api/listings/${listingId}/photos/archive`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 401) {
      clearToken()
      window.dispatchEvent(new Event('avito:unauthorized'))
      throw new Error('Сессия истекла')
    }
    if (!res.ok) throw new Error('Не удалось скачать архив')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listing-${listingId}-photos.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  async downloadDraftsArchive(): Promise<void> {
    const token = getToken()
    const res = await fetch('/api/listings/drafts/archive', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 401) {
      clearToken()
      window.dispatchEvent(new Event('avito:unauthorized'))
      throw new Error('Сессия истекла')
    }
    if (!res.ok) throw new Error('Не удалось скачать архив черновиков')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drafts.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  async getPhotoBlob(url: string): Promise<Blob> {
    const token = getToken()
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 401) {
      clearToken()
      window.dispatchEvent(new Event('avito:unauthorized'))
      throw new Error('Сессия истекла')
    }
    if (!res.ok) throw new Error('Не удалось загрузить фото')
    return res.blob()
  },
}
