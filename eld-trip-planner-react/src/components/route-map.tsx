import { useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import type { TripResult } from "@/lib/types"

interface RouteMapProps {
    result: TripResult | null
}

export function RouteMap({ result }: RouteMapProps) {

    const mapRef = useRef<HTMLDivElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null)
    const [isReady, setIsReady] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leafletRef = useRef<any>(null)

    // Dynamically import Leaflet on mount (client-only)
    useEffect(() => {
        let cancelled = false

        async function init() {
            const L = await import("leaflet")
            await import("leaflet/dist/leaflet.css")

            if (cancelled || !mapRef.current) return

            leafletRef.current = L

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
            }

            const map = L.map(mapRef.current, {
                center: [39.8283, -98.5795],
                zoom: 4,
                zoomControl: true,
                attributionControl: true,
            })

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map)

            mapInstanceRef.current = map
            setIsReady(true)
        }

        init()

        return () => {
            cancelled = true
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [])

    // Draw routes and markers when result changes
    useEffect(() => {
        if (!isReady || !mapInstanceRef.current || !leafletRef.current || !result)
            return

        const L = leafletRef.current
        const map = mapInstanceRef.current

        // Clear existing layers except tile layer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.eachLayer((layer: any) => {
            if (!(layer instanceof L.TileLayer)) {
                map.removeLayer(layer)
            }
        })

        const allPoints: [number, number][] = []

        // Draw Leg 1 route (blue)
        if (result.routes.leg1.geometry.length > 0) {
            L.polyline(result.routes.leg1.geometry, {
                color: "#3b82f6",
                weight: 4,
                opacity: 0.8,
            }).addTo(map)
            allPoints.push(...result.routes.leg1.geometry)
        }

        // Draw Leg 2 route (red)
        if (result.routes.leg2.geometry.length > 0) {
            L.polyline(result.routes.leg2.geometry, {
                color: "#ef4444",
                weight: 4,
                opacity: 0.8,
            }).addTo(map)
            allPoints.push(...result.routes.leg2.geometry)
        }

        // Helper to create custom div markers
        function createMarker(
            lat: number,
            lon: number,
            label: string,
            color: string,
            emoji: string
        ) {
            const icon = L.divIcon({
                className: "custom-marker",
                html: `<div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        ">${emoji}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            })
            L.marker([lat, lon], { icon }).addTo(map).bindPopup(label)
        }

        // Add location markers
        createMarker(
            result.locations.current.lat,
            result.locations.current.lon,
            `Start: ${result.locations.current.display_name}`,
            "#22c55e",
            "&#x1F4CD;"
        )
        createMarker(
            result.locations.pickup.lat,
            result.locations.pickup.lon,
            `Pickup: ${result.locations.pickup.display_name}`,
            "#3b82f6",
            "&#x1F4E6;"
        )
        createMarker(
            result.locations.dropoff.lat,
            result.locations.dropoff.lon,
            `Dropoff: ${result.locations.dropoff.display_name}`,
            "#ef4444",
            "&#x1F3C1;"
        )

        // Add event markers for fuel and rest stops
        for (const event of result.events) {
            if (event.type === "fuel" && event.lat && event.lon) {
                createMarker(event.lat, event.lon, event.label, "#f97316", "&#x26FD;")
            } else if (event.type === "rest" && event.lat && event.lon) {
                createMarker(event.lat, event.lon, event.label, "#8b5cf6", "&#x1F634;")
            }
        }

        // Fit bounds
        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints)
            map.fitBounds(bounds, { padding: [40, 40] })
        }
    }, [isReady, result])

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden relative">
            <div ref={mapRef} className="h-[480px] w-full" />
        </div>
    )

}
