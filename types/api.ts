import type { Spot } from "./spot"

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}

export interface HealthResponse {
  ok: true
  service: "openlate-api"
}

export interface AuthenticatedUserResponse {
  sub: string
}

export interface SpotsSearchResponse {
  spots: Spot[]
  source: "live" | "cache" | "stale"
  budgetExceeded?: boolean
}

export interface SpotDetailsResponse {
  spot: Spot
  source: "live" | "cache" | "stale"
  budgetExceeded?: boolean
}

export interface SpotReview {
  authorName: string
  rating: number | null
  text: string
  publishTime: string | null
  relativePublishTimeDescription: string | null
  authorPhotoUri: string | null
}

export interface SpotReviewsResponse {
  placeId: string
  reviews: SpotReview[]
  source: "live" | "cache" | "stale"
  budgetExceeded?: boolean
}

export interface FavoritesResponse {
  favoriteSpotIds: string[]
}
