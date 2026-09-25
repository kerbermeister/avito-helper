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
}

export interface ListingSummary {
  id: number
  title: string
  priceKopecks: number
  currency: string
  category: string | null
  status: ListingStatus
  updatedAt: string
  coverPhotoId: number | null
  photoCount: number
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

export interface ListingPayload {
  title: string
  description: string
  priceKopecks: number
  category: string | null
}
