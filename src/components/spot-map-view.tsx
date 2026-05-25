"use client"

import { useEffect, useState, useMemo } from "react"
import { Star, Clock, MapPin, X, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import type { Spot } from "@/lib/spot-types"
import { formatTimeLabel, isSpotOpenTwentyFourSeven } from "@/lib/spot-hours"

interface SpotMapViewProps {
  spots: Spot[]
  onSpotClick: (spot: Spot) => void
  userLocation?: { lat: number; lng: number } | null
  distance: number
  favoriteSpotIds: string[]
  onToggleFavorite: (spotId: string) => void
  onOpenReviews: (spot: Spot) => void
}

// Generate random coordinates around a center point
function generateCoordinates(
  index: number,
  total: number,
  centerLat: number,
  centerLng: number,
  radiusMiles: number
) {
  // Convert miles to approximate degrees (rough estimate)
  const radiusDeg = radiusMiles * 0.0145

  // Use golden angle for better distribution
  const angle = index * 2.39996323 // golden angle in radians
  const r = Math.sqrt(index / total) * radiusDeg

  return {
    lat: centerLat + r * Math.cos(angle),
    lng: centerLng + r * Math.sin(angle),
  }
}

export function SpotMapView({
  spots,
  onSpotClick,
  userLocation,
  distance,
  favoriteSpotIds,
  onToggleFavorite,
  onOpenReviews,
}: SpotMapViewProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    spots: Spot[]
    onSpotClick: (spot: Spot) => void
    userLocation?: { lat: number; lng: number } | null
    distance: number
    favoriteSpotIds: string[]
    onToggleFavorite: (spotId: string) => void
    onOpenReviews: (spot: Spot) => void
  }> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Dynamic import of map to avoid SSR issues
    import("./map-client").then((mod) => {
      setMapComponent(() => mod.MapClient)
      setIsLoading(false)
    })
  }, [])

  if (isLoading || !MapComponent) {
    return <MapSkeleton />
  }

  return (
    <MapComponent
      spots={spots}
      onSpotClick={onSpotClick}
      userLocation={userLocation}
      distance={distance}
      favoriteSpotIds={favoriteSpotIds}
      onToggleFavorite={onToggleFavorite}
      onOpenReviews={onOpenReviews}
    />
  )
}

function MapSkeleton() {
  return (
    <div className="relative w-full h-[calc(100vh-200px)] min-h-[400px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-center">
        <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-bounce" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
}

// Fallback static map view if Leaflet fails to load
export function StaticMapView({
  spots,
  onSpotClick,
  userLocation,
  distance,
  favoriteSpotIds,
  onToggleFavorite,
  onOpenReviews,
}: SpotMapViewProps) {
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)

  const centerLat = userLocation?.lat ?? 37.7749
  const centerLng = userLocation?.lng ?? -122.4194

  // Generate coordinates for spots
  const spotsWithCoords = useMemo(() => {
    return spots.map((spot, index) => ({
      ...spot,
      coords: generateCoordinates(index, spots.length, centerLat, centerLng, distance),
    }))
  }, [spots, distance, centerLat, centerLng])

  const handlePinClick = (spot: Spot) => {
    // Always show the card when clicking a pin (don't toggle off)
    setSelectedSpot(spot)
  }

  return (
    <div className="relative w-full h-[calc(100vh-200px)] min-h-[400px] bg-muted rounded-lg overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
        {/* Grid lines for visual effect */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Pins */}
      {spotsWithCoords.map((spot, index) => {
        // Convert coordinates to percentage positions
        const xPercent = ((spot.coords.lng - (centerLng - distance * 0.0145)) / (distance * 0.029)) * 100
        const yPercent = ((centerLat + distance * 0.0145 - spot.coords.lat) / (distance * 0.029)) * 100

        const isSelected = selectedSpot?.id === spot.id
        const is24Hours = isSpotOpenTwentyFourSeven(spot)

        return (
          <button
            key={spot.id}
            onClick={() => handlePinClick(spot)}
            className={cn(
              "absolute transform -translate-x-1/2 -translate-y-full transition-all duration-200 z-10",
              isSelected && "z-20"
            )}
            style={{
              left: `${Math.min(95, Math.max(5, xPercent))}%`,
              top: `${Math.min(90, Math.max(10, yPercent))}%`,
            }}
          >
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: isSelected ? 1.2 : 1, y: 0 }}
              transition={{ delay: index * 0.03, type: "spring" }}
              className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg",
                is24Hours ? "bg-emerald-500" : "bg-primary",
                isSelected && "ring-2 ring-white"
              )}
            >
              <MapPin className="h-4 w-4 text-white" />
              {/* Pin tail */}
              <div
                className={cn(
                  "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45",
                  is24Hours ? "bg-emerald-500" : "bg-primary"
                )}
              />
            </motion.div>
          </button>
        )
      })}

      {/* Selected Spot Card */}
      <AnimatePresence>
        {selectedSpot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-[900]"
          >
            <button
              onClick={() => setSelectedSpot(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <button
              onClick={() => onSpotClick(selectedSpot)}
              className="w-full text-left"
            >
              <div className="flex gap-3 p-3">
                <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                  <Image
                    src={selectedSpot.image}
                    alt={selectedSpot.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="font-semibold text-foreground line-clamp-1">
                    {selectedSpot.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedSpot.category} · {selectedSpot.price}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <button
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onOpenReviews(selectedSpot)
                      }}
                      className="flex items-center gap-1 rounded-full bg-secondary/70 px-2 py-0.5"
                      aria-label={`View reviews for ${selectedSpot.name}`}
                    >
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {selectedSpot.rating === null ? "N/A" : selectedSpot.rating.toFixed(1)}
                    </button>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedSpot.distance}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        isSpotOpenTwentyFourSeven(selectedSpot) && "text-emerald-500"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {isSpotOpenTwentyFourSeven(selectedSpot)
                        ? "24/7"
                        : selectedSpot.closingTime
                          ? `Until ${formatTimeLabel(selectedSpot.closingTime)}`
                          : "Hours unavailable"}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation()
                onToggleFavorite(selectedSpot.id)
              }}
              className={cn(
                "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                favoriteSpotIds.includes(selectedSpot.id)
                  ? "bg-rose-100 text-rose-500"
                  : "bg-secondary text-muted-foreground hover:text-rose-500"
              )}
              aria-label={
                favoriteSpotIds.includes(selectedSpot.id)
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  favoriteSpotIds.includes(selectedSpot.id) && "fill-current"
                )}
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg z-10">
        <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-50" />
      </div>

      {/* Distance indicator */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-foreground border border-border">
        {distance} mi radius
      </div>
    </div>
  )
}
