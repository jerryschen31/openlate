"use client"

import { useEffect, useMemo, useState } from "react"
import { Star } from "lucide-react"
import type { SpotReview } from "../../types/api"
import { fetchSpotReviews } from "@/lib/api"
import { getThemeClass, useTimeState } from "@/hooks/use-time-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SpotReviewsModalProps {
  placeId: string | null
  placeName: string | null
  isOpen: boolean
  onClose: () => void
}

interface CachedReviewsEntry {
  reviews: SpotReview[]
  latestReviewTime: string | null
  fetchedAt: number
}

const localReviewsCache = new Map<string, CachedReviewsEntry>()
const staleRefetchThresholdMs = 60 * 24 * 60 * 60 * 1000

export function SpotReviewsModal({ placeId, placeName, isOpen, onClose }: SpotReviewsModalProps) {
  const timeStateInfo = useTimeState()
  const [reviews, setReviews] = useState<SpotReview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const themeClass = getThemeClass(timeStateInfo.state)

  useEffect(() => {
    if (!isOpen || !placeId) {
      if (!isOpen) {
        setReviews([])
        setErrorMessage(null)
        setIsLoading(false)
      }
      return
    }

    let isActive = true
    const cached = localReviewsCache.get(placeId)
    const useCached = cached ? !isLatestReviewOlderThanThreshold(cached.latestReviewTime) : false

    if (cached && useCached) {
      setReviews(cached.reviews)
      setErrorMessage(null)
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    if (cached) {
      setReviews(cached.reviews)
    }

    const loadReviews = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetchSpotReviews(placeId)
        if (!isActive) {
          return
        }

        const normalizedReviews = response.reviews.slice(0, 10)
        setReviews(normalizedReviews)
        localReviewsCache.set(placeId, {
          reviews: normalizedReviews,
          latestReviewTime: getLatestReviewTime(normalizedReviews),
          fetchedAt: Date.now(),
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        if (!cached) {
          setReviews([])
        }
        setErrorMessage(error instanceof Error ? "Could not load reviews right now." : "Could not load reviews right now.")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadReviews()

    return () => {
      isActive = false
    }
  }, [isOpen, placeId])

  const modalDescription = useMemo(() => {
    if (!placeName) {
      return "Recent Google reviews"
    }
    return `Recent Google reviews for ${placeName}`
  }, [placeName])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`${themeClass} top-[calc(env(safe-area-inset-top)+4.25rem)] max-h-[calc(100dvh-env(safe-area-inset-top)-5rem)] w-[min(680px,calc(100%-2rem))] translate-y-0 overflow-hidden border-border bg-popover p-0 text-popover-foreground sm:top-[50%] sm:max-h-[85vh] sm:translate-y-[-50%] sm:max-w-2xl`}
      >
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="pr-10 text-xl font-semibold">Reviews</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-5 py-4">
          {isLoading && reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          ) : null}

          {errorMessage ? (
            <p className="mb-3 text-sm text-muted-foreground">{errorMessage}</p>
          ) : null}

          {!isLoading && reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {placeName ? `There are no reviews for ${placeName}.` : "No recent reviews are available for this spot."}
            </p>
          ) : null}

          {reviews.length > 0 ? (
            <ul className="space-y-3">
              {reviews.map((review, index) => (
                <li key={`${review.authorName}-${review.publishTime ?? "none"}-${index}`} className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{review.authorName || "Google user"}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.relativePublishTimeDescription || formatPublishTime(review.publishTime)}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{review.rating === null ? "N/A" : review.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{review.text || "No review text provided."}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getLatestReviewTime(reviews: SpotReview[]): string | null {
  let latestTimestamp: number | null = null

  for (const review of reviews) {
    if (!review.publishTime) {
      continue
    }

    const parsed = Date.parse(review.publishTime)
    if (!Number.isFinite(parsed)) {
      continue
    }

    if (latestTimestamp === null || parsed > latestTimestamp) {
      latestTimestamp = parsed
    }
  }

  return latestTimestamp === null ? null : new Date(latestTimestamp).toISOString()
}

function isLatestReviewOlderThanThreshold(latestReviewTime: string | null): boolean {
  if (!latestReviewTime) {
    return false
  }

  const parsed = Date.parse(latestReviewTime)
  if (!Number.isFinite(parsed)) {
    return false
  }

  return Date.now() - parsed > staleRefetchThresholdMs
}

function formatPublishTime(value: string | null): string {
  if (!value) {
    return "Date unavailable"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable"
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
