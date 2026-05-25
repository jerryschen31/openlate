"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type SortOption = "distance" | "rating" | "closing" | "name"

interface SortButtonProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "distance", label: "Distance" },
  { value: "rating", label: "Rating" },
  { value: "closing", label: "Closing Time" },
  { value: "name", label: "Name" },
]

export function SortButton({ sortBy, onSortChange }: SortButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentLabel = sortOptions.find((o) => o.value === sortBy)?.label || "Sort"

  return (
    <div
      ref={buttonRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 safe-area-bottom"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-1.5">
              {sortOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    onSortChange(value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                    value === sortBy
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-popover-foreground hover:bg-accent"
                  )}
                >
                  <span>{label}</span>
                  {value === sortBy && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pill Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-full",
          "bg-background/80 backdrop-blur-xl",
          "border border-border shadow-lg shadow-black/20",
          "text-sm font-medium text-foreground",
          "hover:bg-background/90 transition-all"
        )}
      >
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <span>Sort: {currentLabel}</span>
      </motion.button>
    </div>
  )
}
