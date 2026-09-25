import type {
  AuthResponse,
  Listing,
  ListingPayload,
  ListingStatus,
  ListingSummary,
  PhotoDto,
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
