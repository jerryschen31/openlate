"use client"

import type { Spot } from "@/lib/spot-types"
import { fetchSpotDetails } from "@/lib/api"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Phone,
  Map,
  Share2,
  Wifi,
  Wine,
  ParkingCircle,
  Utensils,
  X,
  Clock,
  Star,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { formatTimeLabel, isSpotOpenTwentyFourSeven } from "@/lib/spot-hours"

interface SpotDetailsDrawerProps {
  spot: Spot | null
  isOpen: boolean
  onClose: () => void
  onOpenReviews: (spot: Spot) => void
}

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

export function SpotDetailsDrawer({ spot, isOpen, onClose, onOpenReviews }: SpotDetailsDrawerProps) {
  const [lobbyVote, setLobbyVote] = useState<"yes" | "no" | null>(null)
  const [detailsSpot, setDetailsSpot] = useState<Spot | null>(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const today = dayNames[new Date().getDay()]
  const useMockSpots = process.env.NEXT_PUBLIC_USE_MOCK_SPOTS === "true"

  useEffect(() => {
    if (!isOpen || !spot) {
      setDetailsSpot(null)
      setDetailsError(null)
      setIsDetailsLoading(false)
      return
    }

    if (useMockSpots) {
      setDetailsSpot(spot)
      setDetailsError(null)
      setIsDetailsLoading(false)
      return
    }

    let isActive = true

    const loadDetails = async () => {
      setIsDetailsLoading(true)
      setDetailsError(null)

      try {
        const response = await fetchSpotDetails(spot.id)
        if (!isActive) return
        setDetailsSpot(response.spot)
      } catch (error) {
        if (!isActive) return
        setDetailsSpot(spot)
        setDetailsError(error instanceof Error ? "Live details unavailable" : "Live details unavailable")
      } finally {
        if (isActive) {
          setIsDetailsLoading(false)
        }
      }
    }

    void loadDetails()

    return () => {
      isActive = false
    }
  }, [isOpen, spot, useMockSpots])

  const displaySpot = detailsSpot ?? spot
  const ratingLabel = useMemo(() => {
    if (!displaySpot || displaySpot.rating === null) {
      return "N/A"
    }
    return displaySpot.rating.toFixed(1)
  }, [displaySpot])

  if (!displaySpot) return null

  const handleCall = () => {
    if (!displaySpot.phone) {
      return
    }

    window.open(`tel:${displaySpot.phone}`, "_self")
  }

  const handleMaps = () => {
    if (displaySpot.googleMapsUri) {
      window.open(displaySpot.googleMapsUri, "_blank")
      return
    }

    const query = encodeURIComponent(displaySpot.address)
    window.open(`https://maps.google.com/?q=${query}`, "_blank")
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displaySpot.name,
          text: `Check out ${displaySpot.name} on Openlate!`,
          url: window.location.href,
        })
      } catch {
        // User cancelled or error
      }
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh] focus:outline-none">
        {/* Hero Image */}
        <div className="relative h-48 w-full overflow-hidden">
          <img src={displaySpot.image} alt={displaySpot.name} className="h-full w-full object-cover" crossOrigin="anonymous" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          {/* Close Button */}
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70"
            >
              <X className="h-4 w-4 text-white" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>

          {/* Rating Badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <button
              onClick={() => onOpenReviews(displaySpot)}
              className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm"
              aria-label={`View reviews for ${displaySpot.name}`}
            >
              <Star className="h-4 w-4 fill-amber text-amber" />
              <span className="text-sm font-semibold text-white">{ratingLabel}</span>
              <span className="text-xs text-white/70">({displaySpot.reviewCount ?? 0})</span>
            </button>
            {isSpotOpenTwentyFourSeven(displaySpot) && <Badge className="bg-success text-success-foreground">Open 24/7</Badge>}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 pb-4">
          <DrawerHeader className="px-0 pt-4">
            <DrawerTitle className="text-xl font-bold">{displaySpot.name}</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              {displaySpot.category} • {displaySpot.price} • {displaySpot.distance}
            </DrawerDescription>
          </DrawerHeader>

          {(isDetailsLoading || detailsError) && (
            <p className="mb-3 text-xs text-muted-foreground">
              {isDetailsLoading ? "Loading live details…" : "Using preview details while live details are unavailable."}
            </p>
          )}

          {/* Address */}
          <p className="text-sm text-muted-foreground mb-4">{displaySpot.address}</p>

          {/* Hours Section */}
          <div className="mb-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Clock className="h-4 w-4 text-primary" />
              Operating Hours
            </h4>
            <div className="space-y-1.5 rounded-lg bg-secondary/50 p-3">
              {dayNames.map((day) => {
                const hours = displaySpot.hours[day]
                const isToday = day === today
                const isUnavailable = !hours
                const isClosed = Boolean(hours) && hours.open === "00:00" && hours.close === "00:00"

                return (
                  <div
                    key={day}
                    className={`flex justify-between text-sm ${isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}
                  >
                    <span className="capitalize">{isToday ? `${day} (Today)` : day}</span>
                    <span>
                      {isUnavailable
                        ? "Unavailable"
                        : isClosed
                        ? "Closed"
                        : hours.open === "00:00" && hours.close === "23:59"
                          ? "Open 24 Hours"
                          : `${formatTimeLabel(hours.open)} - ${formatTimeLabel(hours.close)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Amenities Section */}
          <div className="mb-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Amenities
              <span className="text-xs font-normal text-muted-foreground">Confirmed by Google Places</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <AmenityItem icon={<Wifi className="h-5 w-5" />} label="Free Wi-Fi" available={displaySpot.amenities.wifi} />
              <AmenityItem icon={<Wine className="h-5 w-5" />} label="Serves Alcohol" available={displaySpot.amenities.alcohol} />
              <AmenityItem icon={<Utensils className="h-5 w-5" />} label="Dine-In Seating" available={displaySpot.amenities.dineIn} />
              <AmenityItem icon={<ParkingCircle className="h-5 w-5" />} label="Free Parking" available={displaySpot.amenities.parking} />
            </div>
          </div>

          {/* Community Pulse */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-3">Community Pulse</h4>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-sm text-muted-foreground mb-3">Is the lobby open right now?</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLobbyVote("yes")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all touch-target ${
                    lobbyVote === "yes" ? "bg-success text-white" : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLobbyVote("no")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all touch-target ${
                    lobbyVote === "no" ? "bg-danger text-white" : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                  No
                </motion.button>
              </div>
              <AnimatePresence>
                {lobbyVote && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-muted-foreground mt-3 text-center"
                  >
                    Thanks for helping the community!
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <DrawerFooter className="border-t border-border pt-4 safe-area-bottom">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="secondary"
              className="flex-col gap-1 h-auto py-3 touch-target"
              onClick={handleCall}
              disabled={!displaySpot.phone}
            >
              <Phone className="h-5 w-5" />
              <span className="text-xs">Call</span>
            </Button>
            <Button
              variant="secondary"
              className="flex-col gap-1 h-auto py-3 touch-target"
              onClick={handleMaps}
            >
              <Map className="h-5 w-5" />
              <span className="text-xs">Open in Maps</span>
            </Button>
            <Button
              variant="secondary"
              className="flex-col gap-1 h-auto py-3 touch-target"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function AmenityItem({
  icon,
  label,
  available,
}: {
  icon: React.ReactNode
  label: string
  available: boolean | null
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-3 ${
        available ? "bg-primary/10 text-primary" : "bg-secondary/30 text-muted-foreground opacity-50"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}
