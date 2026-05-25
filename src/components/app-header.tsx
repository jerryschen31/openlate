"use client"

import { useState, useRef, useEffect } from "react"
import { LoginLink, LogoutLink, useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutGrid, List, Map, ChevronDown, Check, Menu, X, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type ViewMode = "cards" | "list" | "map"
export type Distance = 1 | 3 | 5 | 10 | 25

interface AppHeaderProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  distance: Distance
  onDistanceChange: (distance: Distance) => void
  onBrandClick?: () => void
}

const distances: Distance[] = [1, 3, 5, 10, 25]

export function AppHeader({
  viewMode,
  onViewModeChange,
  distance,
  onDistanceChange,
  onBrandClick,
}: AppHeaderProps) {
  const { user, isAuthenticated, isLoading } = useKindeBrowserClient()
  const logoutRedirectUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openlate.app"
  const [isDistanceOpen, setIsDistanceOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDistanceOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-[1300] bg-background border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-2">
            {/* Hamburger Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "flex items-center justify-center p-2 rounded-lg transition-all",
                  "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  isMenuOpen && "bg-secondary text-foreground"
                )}
                aria-label="Menu"
              >
                <Menu className="h-[1.3125rem] w-[1.3125rem]" />
              </button>

              {/* Hamburger Drawer */}
              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 z-[2100]"
                      onClick={() => setIsMenuOpen(false)}
                    />
                    {/* Drawer */}
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "-100%" }}
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      className="fixed top-0 left-0 h-screen w-72 bg-background border-r border-border z-[2101] shadow-2xl"
                    >
                      <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                          <div className="flex items-center gap-2">
                            <Moon className="h-[1.05rem] w-[1.05rem] text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">
                              Open<span className="text-primary">Late</span>
                            </h2>
                          </div>
                          <button
                            onClick={() => setIsMenuOpen(false)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                          >
                            <X className="h-[1.3125rem] w-[1.3125rem]" />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            {isLoading
                              ? "Checking session..."
                              : `Welcome ${isAuthenticated ? user?.email ?? "Guest" : "Guest"}!`}
                          </p>
                          {isAuthenticated ? (
                            <LogoutLink
                              onClick={() => setIsMenuOpen(false)}
                              postLogoutRedirectURL={logoutRedirectUrl}
                              className="block w-full"
                            >
                              <Button className="w-full" size="lg" variant="destructive">
                                Logout
                              </Button>
                            </LogoutLink>
                          ) : (
                            <LoginLink onClick={() => setIsMenuOpen(false)} className="block w-full">
                              <Button className="w-full" size="lg">
                                Sign In
                              </Button>
                            </LoginLink>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border">
                          <p className="text-xs text-muted-foreground text-center">
                            Find late-night spots near you
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* App Name */}
            <button
              onClick={onBrandClick}
              className="text-[1.18rem] sm:text-[1.31rem] font-bold text-foreground tracking-tight"
              aria-label="Back to top"
            >
              Open<span className="text-primary">Late</span>
            </button>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
            {/* Distance Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDistanceOpen(!isDistanceOpen)}
                className={cn(
                  "flex items-center gap-0.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-all",
                  "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  "border border-border"
                )}
              >
                <span className="font-semibold">{distance}mi</span>
                <ChevronDown
                  className={cn(
                    "h-[0.92rem] w-[0.92rem] transition-transform",
                    isDistanceOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {isDistanceOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-28 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-[2200]"
                  >
                    {distances.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          onDistanceChange(d)
                          setIsDistanceOpen(false)
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                          d === distance
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-popover-foreground hover:bg-accent"
                        )}
                      >
                        <span>{d} mi</span>
                        {d === distance && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View Mode Toggle - Compact */}
            <div className="flex items-center bg-secondary rounded-md p-0.5 border border-border">
              <ViewModeButton
                mode="cards"
                currentMode={viewMode}
                onClick={() => onViewModeChange("cards")}
                icon={<LayoutGrid className="h-[1.05rem] w-[1.05rem]" />}
                label="Cards"
              />
              <ViewModeButton
                mode="list"
                currentMode={viewMode}
                onClick={() => onViewModeChange("list")}
                icon={<List className="h-[1.05rem] w-[1.05rem]" />}
                label="List"
              />
              <ViewModeButton
                mode="map"
                currentMode={viewMode}
                onClick={() => onViewModeChange("map")}
                icon={<Map className="h-[1.05rem] w-[1.05rem]" />}
                label="Map"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

interface ViewModeButtonProps {
  mode: ViewMode
  currentMode: ViewMode
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function ViewModeButton({ mode, currentMode, onClick, icon, label }: ViewModeButtonProps) {
  const isActive = mode === currentMode

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center p-1.5 sm:p-[0.4rem] rounded transition-all",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-label={label}
      title={label}
    >
      <span className="relative z-10">{icon}</span>
    </button>
  )
}
