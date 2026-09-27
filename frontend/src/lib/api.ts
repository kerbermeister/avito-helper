import type {
  AuthResponse,
  Listing,
  ListingPayload,
  ListingStatus,
  ListingSummary,
  PhotoDto,
  StructuredListing,
  StructuringProgress,
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

    if (res.status === 401) {
      clearToken()
      window.dispatchEvent(new Event('avito:unauthorized'))
    }
    if (!res.ok || !res.body) {
      let message = `Ошибка ${res.status}`
      try {
        const data = (await res.json()) as { message?: string }
        if (data.message) message = data.message
      } catch {
        // ignore
      }
      throw new Error(message)
    }

    const state: { result: StructuredListing | null; error: string | null } = {
      result: null,
      error: null,
    }

    const handleBlock = (block: string) => {
      let eventName = 'message'
      const dataLines: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
      }
      if (dataLines.length === 0) return
      let data: Record<string, unknown>
      try {
        data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>
      } catch {
        return
      }
      switch (eventName) {
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
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const flush = (text: string) => {
      buffer += text
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        handleBlock(block)
      }
    }

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      flush(decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n'))
    }
    flush(decoder.decode())
    if (buffer.trim().length > 0) handleBlock(buffer)

    if (state.result) return state.result
    throw new Error(state.error ?? 'Не удалось структурировать объявление')
  },

  async downloadArchive(listingId: number): Promise<void> {
    const token = getToken()
    const res = await fetch(`/api/listings/${listingId}/photos/archive`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
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

  async getPhotoBlob(url: string): Promise<Blob> {
    const token = getToken()
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Не удалось загрузить фото')
    return res.blob()
  },
}
