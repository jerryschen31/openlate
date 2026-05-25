"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Star, Clock, MapPin, X, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import type { Spot } from "@/lib/spot-types"
import { formatTimeLabel, isSpotOpenTwentyFourSeven } from "@/lib/spot-hours"

interface MapClientProps {
  spots: Spot[]
  onSpotClick: (spot: Spot) => void
  userLocation?: { lat: number; lng: number } | null
  distance: number
  favoriteSpotIds: string[]
  onToggleFavorite: (spotId: string) => void
  onOpenReviews: (spot: Spot) => void
}

const fallbackCenterLat = 37.7749
const fallbackCenterLng = -122.4194

// Generate random coordinates around a center point
function generateCoordinates(
  index: number,
  total: number,
  centerLat: number,
  centerLng: number,
  radiusMiles: number
) {
  const radiusDeg = radiusMiles * 0.0145
  const angle = index * 2.39996323
  const r = Math.sqrt(index / total) * radiusDeg

  return {
    lat: centerLat + r * Math.cos(angle),
    lng: centerLng + r * Math.sin(angle),
  }
}

// Custom marker icon
function createMarkerIcon(is24Hours: boolean, isSelected: boolean) {
  const color = is24Hours ? "#10b981" : "#06b6d4"
  const size = isSelected ? 40 : 32

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        ${isSelected ? "transform: scale(1.1);" : ""}
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
}

function createUserLocationIcon() {
  return L.divIcon({
    className: "user-location-marker",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: #3b82f6;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4), 0 2px 10px rgba(0, 0, 0, 0.25);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

// Component to update map view when distance changes
function MapUpdater({ center, distance }: { center: [number, number]; distance: number }) {
  const map = useMap()

  useMemo(() => {
    // Calculate zoom level based on distance
    const zoom = distance <= 1 ? 15 : distance <= 3 ? 14 : distance <= 5 ? 13 : distance <= 10 ? 12 : 11
    map.setView(center, zoom)
  }, [map, center, distance])

  return null
}

export function MapClient({
  spots,
  onSpotClick,
  userLocation,
  distance,
  favoriteSpotIds,
  onToggleFavorite,
  onOpenReviews,
}: MapClientProps) {
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [trackedLocation, setTrackedLocation] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(
    userLocation ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: null } : null,
  )
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!userLocation) {
      return
    }

    setTrackedLocation((current) => ({
      lat: userLocation.lat,
      lng: userLocation.lng,
      accuracy: current?.accuracy ?? null,
    }))
  }, [userLocation])

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return
    }

    let isActive = true

    const stopWatching = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }

    const startWatching = () => {
      if (!isActive || watchIdRef.current !== null || document.visibilityState === "hidden") {
        return
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (!isActive) {
            return
          }

          setTrackedLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          })
        },
        () => {
          // Keep last known location if live updates fail.
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 15000,
        },
      )
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopWatching()
      } else {
        startWatching()
      }
    }

    startWatching()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      isActive = false
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      stopWatching()
    }
  }, [])

  const center: [number, number] = useMemo(() => {
    if (trackedLocation) {
      return [trackedLocation.lat, trackedLocation.lng]
    }

    const firstWithCoordinates = spots.find(
      (spot) => Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude),
    )
    if (firstWithCoordinates?.latitude !== undefined && firstWithCoordinates?.longitude !== undefined) {
      return [firstWithCoordinates.latitude, firstWithCoordinates.longitude]
    }

    return [fallbackCenterLat, fallbackCenterLng]
  }, [spots, trackedLocation])

  // Generate coordinates for spots
  const spotsWithCoords = useMemo(() => {
    return spots.map((spot, index) => ({
      ...spot,
      coords:
        spot.latitude !== undefined && spot.longitude !== undefined
          ? { lat: spot.latitude, lng: spot.longitude }
          : generateCoordinates(index, spots.length, center[0], center[1], distance),
    }))
  }, [center, spots, distance])

  const handleMarkerClick = (spot: Spot & { coords: { lat: number; lng: number } }) => {
    // Always show the card when clicking a pin (don't toggle off)
    setSelectedSpot(spot)
  }

  return (
    <div className="relative w-full h-[calc(100vh-200px)] min-h-[400px] rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl
      >
        <MapUpdater center={center} distance={distance} />
        
        {/* Dark mode tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {trackedLocation && (
          <>
            <Circle
              center={[trackedLocation.lat, trackedLocation.lng]}
              radius={Math.max(20, Math.round(trackedLocation.accuracy ?? 30))}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
                weight: 1,
              }}
            />
            <Marker
              position={[trackedLocation.lat, trackedLocation.lng]}
              icon={createUserLocationIcon()}
              zIndexOffset={1000}
            >
              <Popup>You are here</Popup>
            </Marker>
          </>
        )}

        {/* Spot markers */}
        {spotsWithCoords.map((spot) => (
          <Marker
            key={spot.id}
            position={[spot.coords.lat, spot.coords.lng]}
            icon={createMarkerIcon(isSpotOpenTwentyFourSeven(spot), selectedSpot?.id === spot.id)}
            eventHandlers={{
              click: () => handleMarkerClick(spot),
            }}
          >
            <Popup className="custom-popup">
              <div className="text-sm font-medium">{spot.name}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

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

      {/* Distance indicator */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-foreground border border-border z-[900]">
        {distance} mi radius
      </div>
    </div>
  )
}
