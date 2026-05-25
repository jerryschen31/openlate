"use client"

import { useState, useRef, useEffect } from "react"
import { moodCategories } from "@/lib/mock-data"
import type { MoodCategory } from "@/lib/spot-types"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { SlidersHorizontal, Check, X, Heart } from "lucide-react"
import { toast } from "sonner"
import { createPortal } from "react-dom"

export interface FilterOptions {
  favorites: boolean
  openNow: boolean
  is24Hours: boolean
  hasWifi: boolean
  hasAlcohol: boolean
  hasParking: boolean
  hasDineIn: boolean
}

export const defaultFilters: FilterOptions = {
  favorites: false,
  openNow: false,
  is24Hours: false,
  hasWifi: false,
  hasAlcohol: false,
  hasParking: false,
  hasDineIn: false,
}

interface MoodBarProps {
  selectedMood: MoodCategory | "all"
  onMoodChange: (mood: MoodCategory | "all") => void
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  hidden?: boolean
}

const filterLabels: { key: keyof FilterOptions; label: string }[] = [
  { key: "favorites", label: "Favorites" },
  { key: "openNow", label: "Open Now" },
  { key: "is24Hours", label: "24 Hours" },
  { key: "hasWifi", label: "Wi-Fi" },
  { key: "hasAlcohol", label: "Alcohol" },
  { key: "hasParking", label: "Parking" },
  { key: "hasDineIn", label: "Dine-In" },
]

export function MoodBar({ selectedMood, onMoodChange, filters, onFiltersChange, hidden = false }: MoodBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedTrigger = filterRef.current?.contains(target)
      const clickedDropdown = filterDropdownRef.current?.contains(target)
      if (!clickedTrigger && !clickedDropdown) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isFilterOpen) {
      setDropdownPosition(null)
      return
    }

    const updateDropdownPosition = () => {
      const triggerElement = filterRef.current
      if (!triggerElement) {
        return
      }

      const rect = triggerElement.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: Math.max(12, rect.left),
      })
    }

    updateDropdownPosition()
    window.addEventListener("resize", updateDropdownPosition)
    window.addEventListener("scroll", updateDropdownPosition, true)

    return () => {
      window.removeEventListener("resize", updateDropdownPosition)
      window.removeEventListener("scroll", updateDropdownPosition, true)
    }
  }, [isFilterOpen])

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    const themedRoot = filterRef.current?.closest("[data-theme-scope='openlate']")
    setPortalTarget(themedRoot instanceof HTMLElement ? themedRoot : document.body)
  }, [])

  const handleFilterToggle = (key: keyof FilterOptions) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key],
    })
  }

  const handleClearFilters = () => {
    onFiltersChange(defaultFilters)
  }

  const handleFavoritesClick = () => {
    toast("Favorites coming soon!")
  }

  return (
    <div
      className={cn(
        "relative z-[1250] bg-background/80 backdrop-blur-xl border-b border-border safe-area-top transition-all duration-200",
        hidden && "pointer-events-none -translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-2">
          {/* Filter Button */}
          <div className="relative" ref={filterRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "relative flex items-center justify-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 touch-target",
                "px-[0.68rem] py-[0.56rem] sm:px-[0.9rem]",
                "border-2 border-primary/30 bg-primary/5",
                activeFilterCount > 0
                  ? "text-primary border-primary"
                  : "text-muted-foreground hover:text-foreground hover:border-primary/50"
              )}
              title="Filter"
              aria-label="Filter"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </motion.button>

          </div>

          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex gap-2 w-max">
              {/* All Button - always shows label */}
              <MoodButton
                isSelected={selectedMood === "all"}
                onClick={() => onMoodChange("all")}
                emoji="✨"
                label="All"
                alwaysShowLabel
              />

              {moodCategories.map((mood) => (
                <div key={mood.id} className="flex items-center gap-2">
                  <MoodButton
                    isSelected={selectedMood === mood.id}
                    onClick={() => onMoodChange(mood.id)}
                    emoji={mood.emoji}
                    label={mood.label}
                  />
                  {mood.id === "shopping" && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleFavoritesClick}
                      className="shrink-0 flex items-center justify-center gap-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-target px-[0.68rem] py-[0.56rem] sm:px-[0.9rem]"
                      aria-label="Favorites"
                      title="Favorites"
                    >
                      <Heart className="h-4 w-4" />
                      <span className="hidden sm:inline">Favorites</span>
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {isFilterOpen && dropdownPosition && (
              <motion.div
                ref={filterDropdownRef}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed w-56 bg-card text-foreground border border-border rounded-xl shadow-2xl overflow-hidden z-[2600]"
                style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-medium text-foreground">Filters</span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleClearFilters}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter Options */}
                <div className="p-2">
                  {filterLabels.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleFilterToggle(key)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                        filters[key] ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent",
                      )}
                    >
                      <span>{label}</span>
                      {filters[key] && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}
    </div>
  )
}

interface MoodButtonProps {
  isSelected: boolean
  onClick: () => void
  emoji: string
  label: string
  alwaysShowLabel?: boolean
}

function MoodButton({ isSelected, onClick, emoji, label, alwaysShowLabel = false }: MoodButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 touch-target",
        // Mobile: icon only with smaller padding, unless alwaysShowLabel
        alwaysShowLabel ? "px-[0.9rem] py-[0.56rem]" : "px-[0.68rem] py-[0.56rem] sm:px-[0.9rem]",
        isSelected
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      )}
    >
      <span className="text-[0.9rem]">{emoji}</span>
      {/* Show label always if alwaysShowLabel, otherwise hide on mobile */}
      <span className={alwaysShowLabel ? "inline" : "hidden sm:inline"}>{label}</span>
      {isSelected && (
        <motion.div
          layoutId="mood-indicator"
          className="absolute inset-0 rounded-full bg-primary -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </motion.button>
  )
}
