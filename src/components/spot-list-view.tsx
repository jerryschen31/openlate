"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Star, Clock, MapPin, Wifi, Wine, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Spot } from "@/lib/spot-types"
import { formatTimeLabel, isSpotOpenTwentyFourSeven } from "@/lib/spot-hours"

interface SpotListViewProps {
  spots: Spot[]
  onSpotClick: (spot: Spot) => void
  favoriteSpotIds: string[]
  onToggleFavorite: (spotId: string) => void
  onOpenReviews: (spot: Spot) => void
}

export function SpotListView({
  spots,
  onSpotClick,
  favoriteSpotIds,
  onToggleFavorite,
  onOpenReviews,
}: SpotListViewProps) {
  return (
    <div className="divide-y divide-border">
      {spots.map((spot, index) => (
        <motion.div
          key={spot.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <SpotListItem
            spot={spot}
            onClick={() => onSpotClick(spot)}
            isFavorite={favoriteSpotIds.includes(spot.id)}
            onToggleFavorite={() => onToggleFavorite(spot.id)}
            onOpenReviews={() => onOpenReviews(spot)}
          />
        </motion.div>
      ))}
    </div>
  )
}

interface SpotListItemProps {
  spot: Spot
  onClick: () => void
  isFavorite: boolean
  onToggleFavorite: () => void
  onOpenReviews: () => void
}

function SpotListItem({ spot, onClick, isFavorite, onToggleFavorite, onOpenReviews }: SpotListItemProps) {
  const is24Hours = isSpotOpenTwentyFourSeven(spot)
  
  // Calculate closing soon status
  const getClosingStatus = () => {
    if (is24Hours) return { text: "24/7", variant: "success" as const }
    if (spot.closingTime === null) return { text: "Hours unavailable", variant: "default" as const }
    
    const now = new Date()
    const [hours, minutes] = spot.closingTime!.split(":").map(Number)
    const closingDate = new Date()
    closingDate.setHours(hours, minutes, 0, 0)
    
    // Handle next day closing
    if (closingDate < now) {
      closingDate.setDate(closingDate.getDate() + 1)
    }
    
    const diffMs = closingDate.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins <= 60 && diffMins > 0) {
      return { text: `Closes in ${diffMins}m`, variant: "warning" as const }
    }
    
    return { text: `Until ${formatTimeLabel(spot.closingTime)}`, variant: "default" as const }
  }

  const closingStatus = getClosingStatus()
  const ratingLabel = spot.rating === null ? "N/A" : spot.rating.toFixed(1)

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      className="relative w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-accent/50 transition-colors text-left touch-target cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted">
        <Image
          src={spot.image}
          alt={spot.name}
          fill
          className="object-cover"
          sizes="80px"
        />
        {/* 24/7 Badge on thumbnail */}
        {is24Hours && (
          <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            24/7
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
            {spot.name}
          </h3>
          {/* Rating */}
          <button
            onClick={(event) => {
              event.stopPropagation()
              onOpenReviews()
            }}
            className="flex items-center gap-1 shrink-0 rounded-full bg-secondary/70 px-2 py-0.5"
            aria-label={`View reviews for ${spot.name}`}
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs sm:text-sm font-medium text-foreground">
              {ratingLabel}
            </span>
          </button>
        </div>

        {/* Category & Price */}
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
          {spot.category} · {spot.price}
        </p>

        {/* Meta Row */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {/* Distance */}
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {spot.distance}
          </span>

          {/* Hours Status */}
          <span
            className={cn(
              "flex items-center gap-1",
              closingStatus.variant === "success" && "text-emerald-500",
              closingStatus.variant === "warning" && "text-amber-500"
            )}
          >
            <Clock className="h-3 w-3" />
            {closingStatus.text}
          </span>

          {/* Amenity Icons */}
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            {spot.amenities.wifi && (
              <span title="Wi-Fi">
                <Wifi className="h-3.5 w-3.5 text-primary" />
              </span>
            )}
            {spot.amenities.alcohol && (
              <span title="Serves alcohol">
                <Wine className="h-3.5 w-3.5 text-primary" />
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite()
        }}
        className={cn(
          "absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          isFavorite
            ? "bg-rose-100 text-rose-500"
            : "bg-secondary text-muted-foreground hover:text-rose-500"
        )}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
      </button>
    </div>
  )
}

export function SpotListViewSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
