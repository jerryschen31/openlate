"use client"

import { Button } from "@/components/ui/button"
import { MapPinOff, Navigation } from "lucide-react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface LocationErrorProps {
  onRetry: () => void
  onZipSubmit: (zip: string) => void
}

export function LocationError({ onRetry, onZipSubmit }: LocationErrorProps) {
  const [zip, setZip] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (zip.length >= 5) {
      onZipSubmit(zip)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
        <MapPinOff className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <h2 className="text-xl font-semibold mb-2">
        {"We can't see you in the dark"}
      </h2>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Share your location to find late-night spots near you, or enter your zip code below.
      </p>

      <Button
        onClick={onRetry}
        className="mb-6 gap-2 touch-target"
        size="lg"
      >
        <Navigation className="h-4 w-4" />
        Share Location
      </Button>

      <div className="w-full max-w-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter zip code"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="text-center touch-target"
            maxLength={5}
          />
          <Button type="submit" variant="secondary" disabled={zip.length < 5}>
            Go
          </Button>
        </form>
      </div>
    </motion.div>
  )
}
