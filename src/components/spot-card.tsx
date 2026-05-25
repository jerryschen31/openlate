"use client"

import type { Spot } from "@/lib/spot-types"
import { Badge } from "@/components/ui/badge"
import { Wifi, Wine, MapPin, Heart } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { formatTimeLabel, isSpotOpenTwentyFourSeven } from "@/lib/spot-hours"

interface SpotCardProps {
  spot: Spot
  onClick: () => void
  isFavorite: boolean
  onToggleFavorite: () => void
  onOpenReviews: (spot: Spot) => void
}

function getStatusBadge(spot: Spot): {
  variant: "default" | "destructive" | "secondary" | "outline"
  text: string
  className: string
} {
  if (isSpotOpenTwentyFourSeven(spot)) {
    return {
      variant: "default",
      text: "Open 24/7",
      className: "bg-success text-success-foreground border-success/50",
    }
  }

  if (spot.closingTime === null) {
    return {
      variant: "outline",
      text: "Hours unavailable",
      className: "bg-secondary text-secondary-foreground border-border",
    }
  }

  // Calculate minutes until closing
  const now = new Date()
  const [closeHour, closeMinute] = spot.closingTime.split(":").map(Number)
  const closeTime = new Date()
  closeTime.setHours(closeHour, closeMinute, 0, 0)

  // If closing time is earlier than now, it's tomorrow
  if (closeTime <= now) {
    closeTime.setDate(closeTime.getDate() + 1)
  }

  const minutesUntilClose = Math.floor(
    (closeTime.getTime() - now.getTime()) / 60000
  )

  if (minutesUntilClose <= 60) {
    return {
      variant: "destructive",
      text: `Closing in ${minutesUntilClose} min`,
      className: "bg-danger text-white border-danger/50 animate-pulse",
    }
  }

  return {
    variant: "secondary",
    text: `Closes at ${formatTimeLabel(spot.closingTime)}`,
    className: "bg-yellow-400 text-black border-yellow-500 font-semibold",
  }
}

export function SpotCard({ spot, onClick, isFavorite, onToggleFavorite, onOpenReviews }: SpotCardProps) {
  const [status, setStatus] = useState(getStatusBadge(spot))
  const ratingLabel = useMemo(() => (spot.rating === null ? "N/A" : spot.rating.toFixed(1)), [spot.rating])

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getStatusBadge(spot))
    }, 60000)
    return () => clearInterval(interval)
  }, [spot])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className="touch-target cursor-pointer h-full"
      onClick={onClick}
    >
      <div className="group relative overflow-hidden rounded-xl bg-card border border-border transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 h-full flex flex-col">
        {/* Image Container */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
          <img
            src={spot.image}
            alt={spot.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            crossOrigin="anonymous"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Status Badge */}
          <div className="absolute left-3 top-3">
            <Badge className={`${status.className} text-xs font-medium px-2.5 py-1`}>
              {status.text}
            </Badge>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite()
            }}
            className={cn(
              "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors",
              isFavorite
                ? "bg-rose-100/90 text-rose-500"
                : "bg-black/60 text-white hover:text-rose-400"
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </button>

          {/* Amenity Icons */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {spot.amenities.wifi && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                <Wifi className="h-3.5 w-3.5 text-cyan" />
              </div>
            )}
            {spot.amenities.alcohol && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                <Wine className="h-3.5 w-3.5 text-amber" />
              </div>
            )}
          </div>

          {/* Rating */}
          <button
            onClick={(event) => {
              event.stopPropagation()
              onOpenReviews(spot)
            }}
            className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm"
            aria-label={`View reviews for ${spot.name}`}
          >
            <span className="text-amber text-xs">★</span>
            <span className="text-xs font-medium text-white">{ratingLabel}</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col justify-center">
          <h3 className="font-semibold text-card-foreground text-base leading-tight mb-1.5 line-clamp-1">
            {spot.name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{spot.distance}</span>
            <span className="text-border">•</span>
            <span className="line-clamp-1">{spot.category}</span>
            <span className="text-border">•</span>
            <span>{spot.price}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function SpotCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card border border-border">
      <div className="aspect-[16/10] bg-muted animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
