"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import { useTimeState, getThemeClass } from "@/hooks/use-time-state"
import { addFavorite, fetchFavorites, fetchSpotsSearch, mergeFavorites, removeFavorite } from "@/lib/api"
import { mockSpots } from "@/lib/mock-data"
import type { MoodCategory, Spot } from "@/lib/spot-types"
import type { SpotsSearchResponse } from "../../types/api"
import { AppHeader, ViewMode, Distance } from "@/components/app-header"
import { TimeHeader } from "@/components/time-header"
import { MoodBar, FilterOptions, defaultFilters } from "@/components/mood-bar"
import { SortButton, SortOption } from "@/components/sort-button"
import { SpotCard, SpotCardSkeleton } from "@/components/spot-card"
import { SpotListView, SpotListViewSkeleton } from "@/components/spot-list-view"
import { SpotMapView } from "@/components/spot-map-view"
import { SpotDetailsDrawer } from "@/components/spot-details-drawer"
import { SpotReviewsModal } from "@/components/spot-reviews-modal"
import { LocationError } from "@/components/location-error"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { isSpotOpenTwentyFourSeven } from "@/lib/spot-hours"
import { cn } from "@/lib/utils"

interface SearchCoordinates {
  lat: number
  lng: number
}

const guestFavoritesStorageKey = "openlate_guest_favorite_spot_ids"

// Helper to check if a spot is currently open
function isSpotOpen(spot: Spot): boolean {
  const now = new Date()
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  const currentDay = days[now.getDay()]
  const hours = spot.hours[currentDay]
  
  if (!hours || (hours.open === "00:00" && hours.close === "00:00")) {
    return false // Closed today
  }
  
  // Only treat as 24/7 when explicit full-day hours are present.
  if (isSpotOpenTwentyFourSeven(spot)) {
    return true
  }

  if (spot.closingTime === null) {
    return false
  }
  
  const currentTime = now.getHours() * 60 + now.getMinutes()
  const [openHour, openMin] = hours.open.split(":").map(Number)
  const [closeHour, closeMin] = hours.close.split(":").map(Number)
  
  const openTime = openHour * 60 + openMin
  let closeTime = closeHour * 60 + closeMin
  
  // Handle overnight hours (e.g., closes at 2am)
  if (closeTime < openTime) {
    closeTime += 24 * 60
    const adjustedCurrentTime = currentTime < openTime ? currentTime + 24 * 60 : currentTime
    return adjustedCurrentTime >= openTime && adjustedCurrentTime <= closeTime
  }
  
  return currentTime >= openTime && currentTime <= closeTime
}

export default function Home() {
  const useMockSpots = process.env.NEXT_PUBLIC_USE_MOCK_SPOTS === "true"
  const { isAuthenticated, isLoading: isAuthLoading, getIdTokenRaw } = useKindeBrowserClient()
  const timeStateInfo = useTimeState()
  const [selectedMood, setSelectedMood] = useState<MoodCategory | "all">("eats")
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [reviewsSpot, setReviewsSpot] = useState<Spot | null>(null)
  const [favoriteSpotIds, setFavoriteSpotIds] = useState<string[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLocation, setHasLocation] = useState<boolean | null>(null)
  const [spots, setSpots] = useState<Spot[]>([])
  const [budgetExceeded, setBudgetExceeded] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchCoordinates, setSearchCoordinates] = useState<SearchCoordinates | null>(null)
  const [searchKey, setSearchKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [showTopFilters, setShowTopFilters] = useState(true)
  const localSearchCacheRef = useRef<Map<string, SpotsSearchResponse>>(new Map())
  const favoriteRequestSequenceRef = useRef<Map<string, number>>(new Map())
  const favoriteMutationSequenceRef = useRef(0)
  const hasSyncedAuthFavoritesRef = useRef(false)
  const lastScrollYRef = useRef(0)
  const suppressScrollUiRef = useRef(false)
  const releaseSuppressScrollTimerRef = useRef<number | null>(null)
  
  // Header controls
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [distance, setDistance] = useState<Distance>(10)
  
  // Filter and Sort state
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)
  const [sortBy, setSortBy] = useState<SortOption>("distance")
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)
  const isSearchActive = searchQuery.trim().length > 0

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.trim().length > 0) {
      setSelectedMood("all")
    }
  }, [])

  const handleMoodChange = useCallback((mood: MoodCategory | "all") => {
    setSearchQuery("")
    setSelectedMood(mood)
  }, [])

  const handleBrandClick = useCallback(() => {
    setShowTopFilters(true)
    suppressScrollUiRef.current = true
    if (releaseSuppressScrollTimerRef.current !== null) {
      window.clearTimeout(releaseSuppressScrollTimerRef.current)
    }
    window.scrollTo({ top: 0, behavior: "smooth" })

    releaseSuppressScrollTimerRef.current = window.setTimeout(() => {
      suppressScrollUiRef.current = false
      setShowTopFilters(true)
      releaseSuppressScrollTimerRef.current = null
    }, 500)
  }, [])

  const effectiveTimeState = timeStateInfo.state

  const getFavoriteAuthToken = useCallback((): string | null => {
    const token = getIdTokenRaw?.()?.trim()
    return token || null
  }, [getIdTokenRaw])

  const requestCurrentLocation = useCallback(async (): Promise<SearchCoordinates> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new Error("Location services are unavailable in this browser")
    }

    return new Promise<SearchCoordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          reject(new Error("Unable to access your location"))
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 },
      )
    })
  }, [])

  const resolveZipToCoordinates = useCallback(async (zip: string): Promise<SearchCoordinates> => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?country=us&postalcode=${encodeURIComponent(zip)}&format=json&limit=1`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(response.statusText || "Unable to resolve zip code")
    }

    const payload = (await response.json()) as Array<{ lat: string; lon: string }>
    const first = payload[0]
    if (!first) {
      throw new Error("No location found for that zip code")
    }

    const lat = Number(first.lat)
    const lng = Number(first.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Unable to resolve zip code")
    }

    return { lat, lng }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || isAuthLoading || isAuthenticated) {
      return
    }

    setFavoriteSpotIds(readGuestFavorites())
  }, [isAuthenticated, isAuthLoading])

  useEffect(() => {
    if (!isAuthenticated) {
      hasSyncedAuthFavoritesRef.current = false
    }

    if (isAuthLoading || !isAuthenticated) {
      return
    }
    if (hasSyncedAuthFavoritesRef.current) {
      return
    }

    hasSyncedAuthFavoritesRef.current = true

    let isActive = true
    const syncSequence = favoriteMutationSequenceRef.current
    const syncFavorites = async () => {
      try {
        const token = getFavoriteAuthToken()
        if (!token) {
          hasSyncedAuthFavoritesRef.current = false
          return
        }

        const guestFavorites = readGuestFavorites()
        const response =
          guestFavorites.length > 0
            ? await mergeFavorites(token, guestFavorites)
            : await fetchFavorites(token)

        if (!isActive) return
        if (favoriteMutationSequenceRef.current !== syncSequence) return
        setFavoriteSpotIds(response.favoriteSpotIds)

        if (guestFavorites.length > 0) {
          clearGuestFavorites()
        }
      } catch {
        if (!isActive) return
        hasSyncedAuthFavoritesRef.current = false
        setFavoriteSpotIds(readGuestFavorites())
      }
    }

    void syncFavorites()
    return () => {
      isActive = false
    }
  }, [getFavoriteAuthToken, isAuthenticated, isAuthLoading])

  useEffect(() => {
    lastScrollYRef.current = window.scrollY

    const handleScroll = () => {
      const currentY = window.scrollY

      if (suppressScrollUiRef.current) {
        if (currentY <= 2) {
          suppressScrollUiRef.current = false
          setShowTopFilters(true)
        }
        lastScrollYRef.current = currentY
        return
      }

      const delta = currentY - lastScrollYRef.current

      if (currentY <= 16) {
        setShowTopFilters(true)
      } else if (delta > 4 && currentY > 72) {
        setShowTopFilters(false)
      } else if (delta < -8 && currentY < 48) {
        setShowTopFilters(true)
      }

      lastScrollYRef.current = currentY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (releaseSuppressScrollTimerRef.current !== null) {
        window.clearTimeout(releaseSuppressScrollTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let isActive = true

    if (useMockSpots || searchCoordinates) {
      return
    }

    setIsLoading(true)
    setFetchError(null)

    void requestCurrentLocation()
      .then((coords) => {
        if (!isActive) return
        setSearchCoordinates(coords)
        setHasLocation(true)
      })
      .catch((error) => {
        if (!isActive) return
        setHasLocation(false)
        setFetchError(error instanceof Error ? error.message : "Unable to access your location")
      })
      .finally(() => {
        if (!isActive) return
        setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [requestCurrentLocation, searchCoordinates, useMockSpots])

  useEffect(() => {
    let isActive = true

    const loadSpots = async () => {
      setIsLoading(true)
      setFetchError(null)
      setBudgetExceeded(false)

      try {
        if (useMockSpots) {
          if (!isActive) return
          setSpots(mockSpots)
          setHasLocation(true)
          return
        }

        if (!searchCoordinates) {
          if (!isActive) return
          setSpots([])
          return
        }

        const requestedRadiusMeters = Math.max(500, Math.round(distance * 1609.344))
        const coordinatesKey = `${searchCoordinates.lat.toFixed(5)},${searchCoordinates.lng.toFixed(5)}`
        const normalizedQuery = isSearchActive ? debouncedSearchQuery.trim().toLowerCase() : ""
        const category = !isSearchActive && selectedMood !== "all" ? selectedMood : ""
        const radiusCacheKey = `${coordinatesKey}|${requestedRadiusMeters}|${normalizedQuery}|${category}`
        const cachedResponse = localSearchCacheRef.current.get(radiusCacheKey)

        // Use local cache only when this exact coordinate+radius request was previously loaded.
        if (cachedResponse) {
          if (!isActive) return
          setSpots(cachedResponse.spots)
          setBudgetExceeded(Boolean(cachedResponse.budgetExceeded))
          setHasLocation(true)
          return
        }

        const response = await fetchSpotsSearch({
          lat: searchCoordinates.lat,
          lng: searchCoordinates.lng,
          radius: requestedRadiusMeters,
          ...(normalizedQuery ? { q: normalizedQuery } : {}),
          ...(!isSearchActive && selectedMood !== "all" ? { category: selectedMood } : {}),
        })

        if (!isActive) return
        setSpots(response.spots)
        setBudgetExceeded(Boolean(response.budgetExceeded))
        setHasLocation(true)
        localSearchCacheRef.current.set(radiusCacheKey, response)
      } catch (error) {
        if (!isActive) return

        const shouldFallbackToMock = process.env.NODE_ENV !== "production"
        if (shouldFallbackToMock) {
          setSpots(mockSpots)
          setHasLocation(true)
          setFetchError(
            error instanceof Error
              ? `${error.message} — showing mock spots for local fallback`
              : "Search API unavailable — showing mock spots for local fallback",
          )
          return
        }

        setSpots([])
        setHasLocation(true)
        setFetchError(error instanceof Error ? error.message : "Failed to fetch live spots")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadSpots()
    return () => {
      isActive = false
    }
  }, [debouncedSearchQuery, distance, isSearchActive, searchCoordinates, searchKey, selectedMood, useMockSpots])

  // Filter and sort spots
  const filteredSpots = useMemo(() => {
    let filtered = [...spots]

    // Filter by mood/category
    if (selectedMood !== "all") {
      filtered = filtered.filter((spot) => spot.moodCategories.includes(selectedMood))
    }

    // Filter by distance
    filtered = filtered.filter((spot) => {
      const spotDistance = parseDistanceMiles(spot.distance)
      return spotDistance <= distance
    })

    if (filters.favorites) {
      filtered = filtered.filter((spot) => favoriteSpotIds.includes(spot.id))
    }

    // Apply filters
    if (filters.openNow) {
      filtered = filtered.filter(isSpotOpen)
    }
    if (filters.is24Hours) {
      filtered = filtered.filter((spot) => spot.closingTime === null)
    }
    if (filters.hasWifi) {
      filtered = filtered.filter((spot) => spot.amenities.wifi === true)
    }
    if (filters.hasAlcohol) {
      filtered = filtered.filter((spot) => spot.amenities.alcohol === true)
    }
    if (filters.hasParking) {
      filtered = filtered.filter((spot) => spot.amenities.parking === true)
    }
    if (filters.hasDineIn) {
      filtered = filtered.filter((spot) => spot.amenities.dineIn === true)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "distance":
          return parseDistanceMiles(a.distance) - parseDistanceMiles(b.distance)
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0)
        case "closing":
          // 24/7 spots first, then by closing time
          if (a.closingTime === null && b.closingTime !== null) return -1
          if (a.closingTime !== null && b.closingTime === null) return 1
          if (a.closingTime === null && b.closingTime === null) return 0
          // Parse closing times and compare
          const aTime = parseInt(a.closingTime!.replace(":", ""))
          const bTime = parseInt(b.closingTime!.replace(":", ""))
          return bTime - aTime // Later closing times first
        case "name":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }, [selectedMood, distance, filters, sortBy, favoriteSpotIds, spots])

  const handleSpotClick = (spot: Spot) => {
    setSelectedSpot(spot)
    setIsDrawerOpen(true)
  }

  const handleOpenReviews = useCallback((spot: Spot) => {
    setReviewsSpot(spot)
  }, [])

  const handleToggleFavorite = async (spotId: string) => {
    favoriteMutationSequenceRef.current += 1
    const shouldAdd = !favoriteSpotIds.includes(spotId)
    const nextFavoriteSpotIds = shouldAdd
      ? [...favoriteSpotIds, spotId]
      : favoriteSpotIds.filter((id) => id !== spotId)

    setFavoriteSpotIds(nextFavoriteSpotIds)

    if (!isAuthenticated) {
      writeGuestFavorites(nextFavoriteSpotIds)
      toast("Sign In to save your Favorites!")
      return
    }

    const token = getFavoriteAuthToken()
    if (!token) {
      writeGuestFavorites(nextFavoriteSpotIds)
      toast("Saved locally. Please sign in again to sync your favorites.")
      return
    }

    const previousSequence = favoriteRequestSequenceRef.current.get(spotId) ?? 0
    const nextSequence = previousSequence + 1
    favoriteRequestSequenceRef.current.set(spotId, nextSequence)

    try {
      const response = shouldAdd ? await addFavorite(token, spotId) : await removeFavorite(token, spotId)
      if ((favoriteRequestSequenceRef.current.get(spotId) ?? 0) !== nextSequence) {
        return
      }
      setFavoriteSpotIds(response.favoriteSpotIds)
      if (shouldAdd) {
        toast("Saved to Favorites!")
      }
    } catch {
      if ((favoriteRequestSequenceRef.current.get(spotId) ?? 0) !== nextSequence) {
        return
      }

      if (shouldAdd) {
        writeGuestFavorites(nextFavoriteSpotIds)
        toast("Saved locally. We'll sync your favorites when connection stabilizes.")
        return
      }

      setFavoriteSpotIds((previous) =>
        shouldAdd ? previous.filter((id) => id !== spotId) : Array.from(new Set([...previous, spotId])),
      )
    }
  }

  const handleRetryLocation = async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const coords = await requestCurrentLocation()
      setSearchCoordinates(coords)
      setHasLocation(true)
      setSearchKey((value) => value + 1)
    } catch (error) {
      setHasLocation(false)
      setFetchError(error instanceof Error ? error.message : "Unable to access your location")
      setIsLoading(false)
    }
  }

  const handleZipSubmit = async (zip: string) => {
    if (zip.length >= 5) {
      setIsLoading(true)
      setFetchError(null)
      try {
        const coords = await resolveZipToCoordinates(zip)
        setSearchCoordinates(coords)
        setHasLocation(true)
        setSearchKey((value) => value + 1)
      } catch (error) {
        setHasLocation(false)
        setFetchError(error instanceof Error ? error.message : "Unable to resolve zip code")
        setIsLoading(false)
      }
    }
  }

  // Get theme class based on time state
  const themeClass = getThemeClass(effectiveTimeState)

  return (
    <div className={`min-h-screen ${themeClass} bg-background`} data-theme-scope="openlate">
      {/* App Header - Always visible */}
      <AppHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        distance={distance}
        onDistanceChange={setDistance}
        onBrandClick={handleBrandClick}
      />

      <div
        className={cn(
          "transition-[max-height,opacity,transform] duration-300 ease-out",
          showTopFilters
            ? "overflow-visible max-h-[640px] opacity-100 translate-y-0"
            : "overflow-hidden max-h-0 opacity-0 -translate-y-1 pointer-events-none",
        )}
      >
        <TimeHeader
          timeState={effectiveTimeState}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
        />

        {/* Mood Bar with Filters */}
        <MoodBar
          selectedMood={selectedMood}
          onMoodChange={handleMoodChange}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24 safe-area-bottom">
        {(budgetExceeded || fetchError) && (
          <div className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-foreground">
            {budgetExceeded && "Showing recent cached results."}
            {budgetExceeded && fetchError ? " " : ""}
            {fetchError}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <>
            {viewMode === "cards" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <SpotCardSkeleton key={i} />
                ))}
              </div>
            )}
            {viewMode === "list" && <SpotListViewSkeleton />}
            {viewMode === "map" && (
              <div className="h-[calc(100vh-200px)] min-h-[400px] bg-muted animate-pulse rounded-lg" />
            )}
          </>
        )}

        {/* Location Error */}
        {!isLoading && hasLocation === false && (
          <div className="max-w-md mx-auto">
            <LocationError
              onRetry={handleRetryLocation}
              onZipSubmit={handleZipSubmit}
            />
          </div>
        )}

        {/* Content Views */}
        {!isLoading && hasLocation && (
          <AnimatePresence mode="wait">
            {/* Cards View */}
            {viewMode === "cards" && (
              <motion.div
                key={`cards-${selectedMood}-${sortBy}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6"
              >
                {filteredSpots.length > 0 ? (
                  filteredSpots.map((spot, index) => (
                    <motion.div
                      key={spot.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <SpotCard
                        spot={spot}
                        onClick={() => handleSpotClick(spot)}
                        isFavorite={favoriteSpotIds.includes(spot.id)}
                        onToggleFavorite={() => handleToggleFavorite(spot.id)}
                        onOpenReviews={handleOpenReviews}
                      />
                    </motion.div>
                  ))
                ) : (
                  <NoSpotsMessage />
                )}
              </motion.div>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <motion.div
                key={`list-${selectedMood}-${sortBy}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {filteredSpots.length > 0 ? (
                  <SpotListView
                    spots={filteredSpots}
                    onSpotClick={handleSpotClick}
                    favoriteSpotIds={favoriteSpotIds}
                    onToggleFavorite={handleToggleFavorite}
                    onOpenReviews={handleOpenReviews}
                  />
                ) : (
                  <NoSpotsMessage />
                )}
              </motion.div>
            )}

            {/* Map View */}
            {viewMode === "map" && (
              <motion.div
                key={`map-${selectedMood}-${sortBy}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredSpots.length > 0 ? (
                  <SpotMapView
                    spots={filteredSpots}
                    onSpotClick={handleSpotClick}
                    userLocation={searchCoordinates}
                    distance={distance}
                    favoriteSpotIds={favoriteSpotIds}
                    onToggleFavorite={handleToggleFavorite}
                    onOpenReviews={handleOpenReviews}
                  />
                ) : (
                  <NoSpotsMessage />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Floating Sort Button - Only show when not in map view and has spots */}
      {!isLoading && hasLocation && viewMode !== "map" && filteredSpots.length > 0 && (
        <SortButton sortBy={sortBy} onSortChange={setSortBy} />
      )}

      {/* Spot Details Drawer */}
      <SpotDetailsDrawer
        spot={selectedSpot}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenReviews={handleOpenReviews}
      />

      <SpotReviewsModal
        placeId={reviewsSpot?.id ?? null}
        placeName={reviewsSpot?.name ?? null}
        isOpen={Boolean(reviewsSpot)}
        onClose={() => setReviewsSpot(null)}
      />
    </div>
  )
}

function parseDistanceMiles(distanceLabel: string): number {
  const value = Number.parseFloat(distanceLabel.replace(/[^\d.]/g, ""))
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [delayMs, value])

  return debouncedValue
}

function readGuestFavorites(): string[] {
  if (typeof window === "undefined") {
    return []
  }

  const payload = window.localStorage.getItem(guestFavoritesStorageKey)
  if (!payload) {
    return []
  }

  try {
    const parsed = JSON.parse(payload) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return Array.from(new Set(parsed.filter((value): value is string => typeof value === "string")))
  } catch {
    return []
  }
}

function writeGuestFavorites(favoriteSpotIds: string[]): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(guestFavoritesStorageKey, JSON.stringify(favoriteSpotIds))
}

function clearGuestFavorites(): void {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.removeItem(guestFavoritesStorageKey)
}

function NoSpotsMessage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="col-span-full text-center py-16"
    >
      <p className="text-muted-foreground">
        No spots found matching your criteria. Try adjusting your filters or distance.
      </p>
    </motion.div>
  )
}
