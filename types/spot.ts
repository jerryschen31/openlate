export type MoodCategory = "eats" | "nightlife" | "essentials" | "leisure"

export interface Spot {
  id: string
  name: string
  image: string
  latitude?: number
  longitude?: number
  category: string
  price: string
  distance: string
  closingTime: string | null
  hours: Record<string, { open: string; close: string }>
  amenities: {
    wifi: boolean | null
    alcohol: boolean | null
    restrooms: boolean | null
    dineIn: boolean | null
    parking: boolean | null
  }
  phone: string | null
  address: string
  rating: number | null
  reviewCount: number | null
  moodCategories: MoodCategory[]
  googleMapsUri?: string
  websiteUri?: string
}
