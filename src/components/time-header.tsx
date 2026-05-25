"use client"

import { TimeState } from "@/hooks/use-time-state"
import { Moon, Search, Sun, Sunset, X } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TimeHeaderProps {
  timeState: TimeState
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  hidden?: boolean
}

export function TimeHeader({ timeState, searchQuery, onSearchQueryChange, hidden = false }: TimeHeaderProps) {
  const getIcon = () => {
    switch (timeState) {
      case "daytime":
        return <Sun className="h-5 w-5 text-amber" />
      case "sunset":
        return <Sunset className="h-5 w-5 text-amber" />
      case "vampire":
        return <Moon className="h-5 w-5 text-cyan" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-b border-border bg-background/85 px-4 sm:px-6 lg:px-8 py-2.5 transition-all duration-200",
        hidden && "pointer-events-none -translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
            <Search className="h-[1rem] w-[1rem] shrink-0 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Find places open late tonight"
              className="h-6 w-full bg-transparent text-sm text-foreground caret-foreground outline-none placeholder:text-muted-foreground/80"
              aria-label="Find places"
            />
            {searchQuery.trim().length > 0 && (
              <button
                onClick={() => onSearchQueryChange("")}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <motion.div
          key={timeState}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary"
        >
          {getIcon()}
        </motion.div>
      </div>
    </motion.div>
  )
}
