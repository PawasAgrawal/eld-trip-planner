import type { TripFormData, TripResult } from "./types"
import { HOSCalculator } from "./hos-calculator"

// ──────────────────────────────────────────────
// Mock / browser-side helpers (used when no Django backend is configured)
// ──────────────────────────────────────────────

interface GeoResult {
    lat: number
    lon: number
    display_name: string
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function geocode(address: string): Promise<GeoResult> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    const res = await fetch(url, {
        headers: { "User-Agent": "ELD-Trip-Planner/1.0" },
    })
    const data = await res.json()
    if (!data || data.length === 0) {
        throw new Error(`Could not geocode address: ${address}`)
    }
    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name,
    }
}

async function getRoute(
    origin: GeoResult,
    destination: GeoResult
): Promise<{ distance_miles: number; duration_hours: number; geometry: [number, number][] }> {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`
    const res = await fetch(url, {
        headers: { "User-Agent": "ELD-Trip-Planner/1.0" },
    })
    const data = await res.json()
    if (!data.routes || data.routes.length === 0) {
        throw new Error("Could not find a route between these locations")
    }
    const route = data.routes[0]
    return {
        distance_miles: Math.round((route.distance / 1609.344) * 10) / 10,
        duration_hours: Math.round((route.duration / 3600) * 100) / 100,
        geometry: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
    }
}

async function planTripMock(data: TripFormData): Promise<TripResult> {
    const { current_location, pickup_location, dropoff_location, current_cycle_used } = data

    // Geocode all locations (with rate limiting for Nominatim)
    const currentGeo = await geocode(current_location)
    await sleep(1100)
    const pickupGeo = await geocode(pickup_location)
    await sleep(1100)
    const dropoffGeo = await geocode(dropoff_location)
    await sleep(1100)

    // Get routes for both legs
    const leg1Route = await getRoute(currentGeo, pickupGeo)
    await sleep(500)
    const leg2Route = await getRoute(pickupGeo, dropoffGeo)

    // Calculate HOS schedule
    const calculator = new HOSCalculator(current_cycle_used || 0)
    const events = calculator.calculateSchedule(
        leg1Route.distance_miles,
        leg1Route.duration_hours,
        leg2Route.distance_miles,
        leg2Route.duration_hours,
        {
            current: { lat: currentGeo.lat, lon: currentGeo.lon },
            pickup: { lat: pickupGeo.lat, lon: pickupGeo.lon },
            dropoff: { lat: dropoffGeo.lat, lon: dropoffGeo.lon },
        }
    )

    const dailyLogs = calculator.getDailyLogs()

    const totalDriving = events
        .filter((e) => e.type === "driving")
        .reduce((sum, e) => sum + e.duration_hours, 0)
    const totalRest = events
        .filter((e) => e.type === "rest" || e.type === "break")
        .reduce((sum, e) => sum + e.duration_hours, 0)

    const firstEvent = events[0]
    const lastEvent = events[events.length - 1]
    const totalDays =
        firstEvent && lastEvent
            ? Math.ceil(
                (new Date(lastEvent.end).getTime() - new Date(firstEvent.start).getTime()) / 86400000
            )
            : 0

    return {
        locations: {
            current: currentGeo,
            pickup: pickupGeo,
            dropoff: dropoffGeo,
        },
        routes: {
            leg1: leg1Route,
            leg2: leg2Route,
        },
        total_distance_miles:
            Math.round((leg1Route.distance_miles + leg2Route.distance_miles) * 10) / 10,
        total_driving_hours: Math.round(totalDriving * 100) / 100,
        total_days: Math.max(1, totalDays),
        total_rest_hours: Math.round(totalRest * 100) / 100,
        events,
        daily_logs: dailyLogs,
    }
}

// ──────────────────────────────────────────────
// Main export — switches between Django and mock
// ──────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined

const useDjango =
    API_BASE && API_BASE !== "" && API_BASE !== "mock"

/**
 * Plan a trip.
 *
 * • If VITE_API_BASE_URL is set to a real URL → POST to Django backend.
 * • Otherwise → runs fully in the browser (mock mode).
 */
export async function planTrip(data: TripFormData): Promise<TripResult> {
    if (useDjango) {
        const res = await fetch(`${API_BASE}/api/trip/plan/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) {
            throw new Error(json.error || "Failed to plan trip")
        }
        return json as TripResult
    }

    return planTripMock(data)
}
