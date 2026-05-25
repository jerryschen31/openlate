import type { Spot } from "@/lib/spot-types"
import type {
  ApiErrorResponse as SharedApiErrorResponse,
  FavoritesResponse,
  SpotDetailsResponse,
  SpotReviewsResponse,
  SpotsSearchResponse,
} from "../../types/api"

export interface SpotsSearchParams {
  lat: number
  lng: number
  radius?: number
  q?: string
  openLate?: boolean
  category?: string
  tz?: string
}

type ApiErrorResponse = Partial<SharedApiErrorResponse>

export async function fetchSpotsSearch(params: SpotsSearchParams): Promise<SpotsSearchResponse> {
  const searchParams = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    tz: params.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  if (params.radius !== undefined) {
    searchParams.set("radius", String(params.radius))
  }
  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim())
  }
  if (params.openLate !== undefined) {
    searchParams.set("openLate", String(params.openLate))
  }
  if (params.category?.trim()) {
    searchParams.set("category", params.category.trim())
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1/spots/search?${searchParams.toString()}`, {
    headers: buildClientHeaders(),
  })
  const payload = await parseJsonPayload<SpotsSearchResponse & ApiErrorResponse>(response)

  if (!response.ok) {
    throw new Error(payload?.error?.message || response.statusText || "Failed to fetch spots")
  }

  if (!payload) {
    throw new Error("Failed to fetch spots")
  }

  return {
    spots: payload.spots.map(normalizeSpot),
    source: payload.source,
    ...(payload.budgetExceeded ? { budgetExceeded: true } : {}),
  }
}

export async function fetchSpotDetails(placeId: string): Promise<SpotDetailsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/spots/${encodeURIComponent(placeId)}`, {
    headers: buildClientHeaders(),
  })
  const payload = await parseJsonPayload<SpotDetailsResponse & ApiErrorResponse>(response)

  if (!response.ok) {
    throw new Error(payload?.error?.message || response.statusText || "Failed to fetch spot details")
  }

  if (!payload) {
    throw new Error("Failed to fetch spot details")
  }

  return {
    spot: normalizeSpot(payload.spot),
    source: payload.source,
    ...(payload.budgetExceeded ? { budgetExceeded: true } : {}),
  }
}

export async function fetchSpotReviews(placeId: string): Promise<SpotReviewsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/spots/${encodeURIComponent(placeId)}/reviews`, {
    headers: buildClientHeaders(),
  })
  const payload = await parseJsonPayload<SpotReviewsResponse & ApiErrorResponse>(response)

  if (!response.ok) {
    throw new Error(payload?.error?.message || response.statusText || "Failed to fetch spot reviews")
  }

  if (!payload) {
    throw new Error("Failed to fetch spot reviews")
  }

  return {
    placeId: payload.placeId,
    reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
    source: payload.source,
    ...(payload.budgetExceeded ? { budgetExceeded: true } : {}),
  }
}

export async function fetchFavorites(token: string): Promise<FavoritesResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/favorites`, {
    headers: buildClientHeaders(token),
  })
  return parseFavoritesResponse(response, "Failed to fetch favorites")
}

export async function mergeFavorites(token: string, favoriteSpotIds: string[]): Promise<FavoritesResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/favorites`, {
    method: "POST",
    headers: {
      ...buildClientHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ favoriteSpotIds }),
  })
  return parseFavoritesResponse(response, "Failed to merge favorites")
}

export async function addFavorite(token: string, placeId: string): Promise<FavoritesResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/favorites/${encodeURIComponent(placeId)}`, {
    method: "PUT",
    headers: buildClientHeaders(token),
  })
  return parseFavoritesResponse(response, "Failed to add favorite")
}

export async function removeFavorite(token: string, placeId: string): Promise<FavoritesResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/favorites/${encodeURIComponent(placeId)}`, {
    method: "DELETE",
    headers: buildClientHeaders(token),
  })
  return parseFavoritesResponse(response, "Failed to remove favorite")
}

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")
}

function normalizeSpot(spot: Spot): Spot {
  if (typeof spot.image !== "string" || !spot.image.startsWith("/")) {
    return spot
  }

  const apiBase = getApiBaseUrl()
  if (!apiBase) {
    return spot
  }

  return {
    ...spot,
    image: `${apiBase}${spot.image}`,
  }
}

async function parseJsonPayload<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function parseFavoritesResponse(response: Response, fallbackMessage: string): Promise<FavoritesResponse> {
  const payload = await parseJsonPayload<FavoritesResponse & ApiErrorResponse>(response)
  if (!response.ok) {
    throw new Error(payload?.error?.message || response.statusText || fallbackMessage)
  }

  return {
    favoriteSpotIds: Array.isArray(payload?.favoriteSpotIds) ? payload.favoriteSpotIds : [],
  }
}

function buildClientHeaders(token?: string): HeadersInit {
  const sessionId = getOrCreateClientSessionId()
  const headers: Record<string, string> = {}

  if (sessionId) {
    headers["X-OpenLate-Client"] = sessionId
  }
  const normalizedToken = typeof token === "string" ? token.trim() : ""
  if (normalizedToken) {
    headers.Authorization = /^Bearer\s+/i.test(normalizedToken) ? normalizedToken : `Bearer ${normalizedToken}`
  }

  return headers
}

function getOrCreateClientSessionId(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  const storageKey = "openlate_client_session_id"
  const existing = window.localStorage.getItem(storageKey)
  if (existing) {
    return existing
  }

  const nextValue = createClientSessionId()
  if (!nextValue) {
    return null
  }

  window.localStorage.setItem(storageKey, nextValue)
  return nextValue
}

function createClientSessionId(): string | null {
  const browserCrypto = typeof crypto !== "undefined" ? crypto : null
  if (!browserCrypto) {
    return null
  }

  if (typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID()
  }

  const sessionIdByteLength = 16
  const bytes = new Uint8Array(sessionIdByteLength)
  if (typeof browserCrypto.getRandomValues !== "function") {
    return null
  }

  browserCrypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}
