import type { Spot } from "@/lib/spot-types"

export function formatTimeLabel(value: string | null | undefined): string {
  if (!value) {
    return ""
  }

  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return value
  }

  const hour24 = Number(match[1])
  const minute = Number(match[2])

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return value
  }

  const suffix = hour24 >= 12 ? "pm" : "am"
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  if (minute === 0 && suffix === "pm") {
    return `${hour12}${suffix}`
  }

  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`
}

export function isSpotOpenTwentyFourSeven(spot: Spot): boolean {
  if (spot.closingTime !== null) {
    return false
  }

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  return days.every((day) => {
    const hours = spot.hours[day]
    return Boolean(hours) && hours.open === "00:00" && hours.close === "23:59"
  })
}
