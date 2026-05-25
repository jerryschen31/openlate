"use client"

import { useState, useEffect } from "react"

export type TimeState = "daytime" | "sunset" | "vampire"

interface TimeStateInfo {
  state: TimeState
  message: string
  hour: number
}

export function useTimeState(): TimeStateInfo {
  const [timeState, setTimeState] = useState<TimeStateInfo>(() => getTimeState())

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeState(getTimeState())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return timeState
}

function getTimeState(): TimeStateInfo {
  const hour = new Date().getHours()

  if (hour >= 6 && hour < 17) {
    return {
      state: "daytime",
      message: "Planning for tonight? Here's what is open late",
      hour,
    }
  } else if (hour >= 17 && hour < 21) {
    return {
      state: "sunset",
      message: "Here's what is open late tonight",
      hour,
    }
  } else {
    return {
      state: "vampire",
      message: "Good evening! These spots are open now.",
      hour,
    }
  }
}

export function getThemeClass(state: TimeState): string {
  switch (state) {
    case "daytime":
      return ""
    case "sunset":
      return "sunset-mode"
    case "vampire":
      return "dark"
  }
}
