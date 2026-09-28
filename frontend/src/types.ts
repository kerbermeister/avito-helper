export type ListingStatus =
  | 'DRAFT'
  | 'READY'
  | 'PUBLISHED'
  | 'SOLD'
  | 'ARCHIVED'
  | 'CANCELLED'

export interface PhotoDto {
  id: number
  fileName: string | null
  mimeType: string
  sizeBytes: number
  sortOrder: number
  createdAt: string
  url: string
  thumbUrl: string
}

export interface ListingSummary {
  id: number
  title: string
  priceKopecks: number
  currency: string
  category: string | null
  status: ListingStatus
  createdAt: string
  updatedAt: string
  coverPhotoId: number | null
  photoCount: number
  photoIds: number[]
}

export interface Listing {
  id: number
  title: string
  description: string | null
  priceKopecks: number
  currency: string
  category: string | null
  status: ListingStatus
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  coverPhotoId: number | null
  photos: PhotoDto[]
}

export interface AuthResponse {
  accessToken: string
  email: string
}

/** Публичные настройки приложения с бэкенда. */
export interface AppConfig {
  maxRecordingSeconds: number
  minSpeechLevel: number
  fieldDictationEnabled: boolean
  imageMaxDimension: number
  imageQuality: number
}

export interface ListingPayload {
  title: string
  description: string
  priceKopecks: number
  category: string | null
}

export interface StructuredListing {
  title: string
  description: string
  category: string | null
  price: number | null
}

/** События прогресса структуризации, которые стримит бэкенд (SSE). */
export type StructuringProgress =
  | { type: 'attempt'; provider: string }
  | { type: 'failure'; provider: string; reason: string }
  | { type: 'success'; provider: string }

/** События прогресса распознавания речи, которые стримит бэкенд (SSE). */
export type TranscriptionProgress =
  | { type: 'attempt'; provider: string }
  | { type: 'failure'; provider: string; reason: string }
  | { type: 'success'; provider: string }
