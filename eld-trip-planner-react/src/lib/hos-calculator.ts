import type { TripEvent, DailyLog, DailyLogSegment } from "./types"

// FMCSA HOS Rules for Property-Carrying Drivers
const MAX_DRIVING = 11 // hours
const MAX_WINDOW = 14 // hours
const REST_PERIOD = 10 // hours
const BREAK_AFTER = 8 // hours of driving before 30-min break required
const BREAK_DURATION = 0.5 // hours
const FUEL_EVERY = 1000 // miles
const FUEL_DURATION = 0.5 // hours
const PICKUP_DURATION = 1 // hour on-duty
const DROPOFF_DURATION = 1 // hour on-duty
const CYCLE_LIMIT = 70 // hours in 8 days

export class HOSCalculator {
    private currentCycleUsed: number
    private events: TripEvent[] = []
    private currentTime: Date
    private drivingInWindow = 0
    private windowStart: Date | null = null
    private drivingSinceBreak = 0
    private totalMilesDriven = 0
    private milesSinceLastFuel = 0

    constructor(currentCycleUsed: number) {
        this.currentCycleUsed = currentCycleUsed
        // Start the trip at 8:00 AM today
        this.currentTime = new Date()
        this.currentTime.setHours(8, 0, 0, 0)
    }

    calculateSchedule(
        leg1Miles: number,
        leg1Hours: number,
        leg2Miles: number,
        leg2Hours: number,
        locations: {
            current: { lat: number; lon: number }
            pickup: { lat: number; lon: number }
            dropoff: { lat: number; lon: number }
        }
    ): TripEvent[] {
        this.events = []

        // Leg 1: Current -> Pickup
        this.driveLeg(leg1Miles, leg1Hours, locations.current, locations.pickup, "Driving to Pickup")

        // Pickup activity
        this.addEvent("pickup", PICKUP_DURATION, "Pickup - Loading", 0, locations.pickup.lat, locations.pickup.lon)

        // Leg 2: Pickup -> Dropoff
        this.driveLeg(leg2Miles, leg2Hours, locations.pickup, locations.dropoff, "Driving to Dropoff")

        // Dropoff activity
        this.addEvent("dropoff", DROPOFF_DURATION, "Dropoff - Unloading", 0, locations.dropoff.lat, locations.dropoff.lon)

        return this.events
    }

    private driveLeg(
        totalMiles: number,
        totalHours: number,
        from: { lat: number; lon: number },
        to: { lat: number; lon: number },
        label: string
    ) {
        let remainingMiles = totalMiles
        let remainingHours = totalHours
        const avgSpeed = totalMiles / totalHours

        while (remainingMiles > 0.5) {
            // Start a duty window if not already in one
            if (this.windowStart === null) {
                this.windowStart = new Date(this.currentTime)
                this.drivingInWindow = 0
                this.drivingSinceBreak = 0
            }

            // Check if we need a 34-hour restart (cycle limit)
            if (this.currentCycleUsed >= CYCLE_LIMIT - 1) {
                this.addEvent("rest", 34, "34-Hour Restart (Cycle Reset)", 0,
                    this.interpolateLat(from, to, 1 - remainingMiles / totalMiles),
                    this.interpolateLon(from, to, 1 - remainingMiles / totalMiles))
                this.currentCycleUsed = 0
                this.windowStart = new Date(this.currentTime)
                this.drivingInWindow = 0
                this.drivingSinceBreak = 0
            }

            // Check if we need a 10-hour rest (14-hour window or 11 hours driving)
            const windowElapsed = this.windowStart
                ? (this.currentTime.getTime() - this.windowStart.getTime()) / 3600000
                : 0

            if (this.drivingInWindow >= MAX_DRIVING || windowElapsed >= MAX_WINDOW - 1) {
                this.addEvent("rest", REST_PERIOD, "10-Hour Rest (HOS Reset)", 0,
                    this.interpolateLat(from, to, 1 - remainingMiles / totalMiles),
                    this.interpolateLon(from, to, 1 - remainingMiles / totalMiles))
                this.windowStart = new Date(this.currentTime)
                this.drivingInWindow = 0
                this.drivingSinceBreak = 0
            }

            // Check if we need a 30-min break (8 hours of driving)
            if (this.drivingSinceBreak >= BREAK_AFTER) {
                this.addEvent("break", BREAK_DURATION, "30-Minute Break (8hr Rule)", 0,
                    this.interpolateLat(from, to, 1 - remainingMiles / totalMiles),
                    this.interpolateLon(from, to, 1 - remainingMiles / totalMiles))
                this.drivingSinceBreak = 0
            }

            // Check if we need a fuel stop
            if (this.milesSinceLastFuel >= FUEL_EVERY) {
                this.addEvent("fuel", FUEL_DURATION, "Fuel Stop", 0,
                    this.interpolateLat(from, to, 1 - remainingMiles / totalMiles),
                    this.interpolateLon(from, to, 1 - remainingMiles / totalMiles))
                this.milesSinceLastFuel = 0
            }

            // Calculate how much we can drive in this chunk
            const maxDriveThisChunk = Math.min(
                MAX_DRIVING - this.drivingInWindow,
                BREAK_AFTER - this.drivingSinceBreak,
                (MAX_WINDOW - 1) - ((this.currentTime.getTime() - (this.windowStart?.getTime() || this.currentTime.getTime())) / 3600000),
                remainingHours
            )

            const driveHours = Math.max(0.1, Math.min(maxDriveThisChunk, remainingHours))
            const driveMiles = Math.min(driveHours * avgSpeed, remainingMiles)
            const actualHours = driveMiles / avgSpeed

            if (actualHours < 0.05) break

            // Calculate intermediate position
            const progress = 1 - (remainingMiles - driveMiles) / totalMiles
            const lat = this.interpolateLat(from, to, progress)
            const lon = this.interpolateLon(from, to, progress)

            this.addEvent("driving", actualHours, label, driveMiles, lat, lon)

            this.drivingInWindow += actualHours
            this.drivingSinceBreak += actualHours
            this.currentCycleUsed += actualHours
            this.totalMilesDriven += driveMiles
            this.milesSinceLastFuel += driveMiles
            remainingMiles -= driveMiles
            remainingHours -= actualHours
        }
    }

    private addEvent(
        type: TripEvent["type"],
        durationHours: number,
        label: string,
        miles: number,
        lat?: number,
        lon?: number
    ) {
        const start = new Date(this.currentTime)
        const end = new Date(this.currentTime.getTime() + durationHours * 3600000)

        this.events.push({
            type,
            start: start.toISOString(),
            end: end.toISOString(),
            duration_hours: Math.round(durationHours * 100) / 100,
            label,
            miles: Math.round(miles * 10) / 10,
            lat,
            lon,
        })

        this.currentTime = end

        // Track on-duty time for cycle
        if (type === "on_duty" || type === "pickup" || type === "dropoff") {
            this.currentCycleUsed += durationHours
            if (this.windowStart === null) {
                this.windowStart = new Date(start)
            }
        }
    }

    private interpolateLat(
        from: { lat: number },
        to: { lat: number },
        progress: number
    ): number {
        return from.lat + (to.lat - from.lat) * Math.min(1, Math.max(0, progress))
    }

    private interpolateLon(
        from: { lon: number },
        to: { lon: number },
        progress: number
    ): number {
        return from.lon + (to.lon - from.lon) * Math.min(1, Math.max(0, progress))
    }

    getDailyLogs(): DailyLog[] {
        if (this.events.length === 0) return []

        const dailyMap = new Map<string, DailyLogSegment[]>()

        for (const event of this.events) {
            const start = new Date(event.start)
            const end = new Date(event.end)

            let cursor = new Date(start)

            while (cursor < end) {
                const dateKey = cursor.toISOString().split("T")[0]
                const dayStart = new Date(dateKey + "T00:00:00.000Z")
                const dayEnd = new Date(dayStart.getTime() + 24 * 3600000)
                const segEnd = end < dayEnd ? end : dayEnd

                const startHour =
                    (cursor.getTime() - dayStart.getTime()) / 3600000
                const endHour =
                    (segEnd.getTime() - dayStart.getTime()) / 3600000

                let status: DailyLogSegment["status"]
                switch (event.type) {
                    case "driving":
                        status = "D"
                        break
                    case "rest":
                        status = "SB"
                        break
                    case "break":
                    case "fuel":
                        status = "OFF"
                        break
                    case "on_duty":
                    case "pickup":
                    case "dropoff":
                        status = "ON"
                        break
                    default:
                        status = "OFF"
                }

                if (!dailyMap.has(dateKey)) {
                    dailyMap.set(dateKey, [])
                }

                dailyMap.get(dateKey)!.push({
                    start_hour: Math.round(startHour * 100) / 100,
                    end_hour: Math.round(endHour * 100) / 100,
                    status,
                    label: event.label,
                })

                cursor = dayEnd
            }
        }

        // Fill gaps with OFF duty and calculate totals
        const logs: DailyLog[] = []

        const sortedDates = Array.from(dailyMap.keys()).sort()
        for (const date of sortedDates) {
            const segments = dailyMap.get(date)!
            segments.sort((a, b) => a.start_hour - b.start_hour)

            // Fill gaps with OFF duty
            const filledSegments: DailyLogSegment[] = []
            let lastEnd = 0

            for (const seg of segments) {
                if (seg.start_hour > lastEnd + 0.01) {
                    filledSegments.push({
                        start_hour: lastEnd,
                        end_hour: seg.start_hour,
                        status: "OFF",
                        label: "Off Duty",
                    })
                }
                filledSegments.push(seg)
                lastEnd = seg.end_hour
            }

            if (lastEnd < 24) {
                filledSegments.push({
                    start_hour: lastEnd,
                    end_hour: 24,
                    status: "OFF",
                    label: "Off Duty",
                })
            }

            // Calculate totals
            const totals = { off_duty: 0, sleeper: 0, driving: 0, on_duty: 0 }
            for (const seg of filledSegments) {
                const dur = seg.end_hour - seg.start_hour
                switch (seg.status) {
                    case "OFF":
                        totals.off_duty += dur
                        break
                    case "SB":
                        totals.sleeper += dur
                        break
                    case "D":
                        totals.driving += dur
                        break
                    case "ON":
                        totals.on_duty += dur
                        break
                }
            }

            logs.push({
                date,
                segments: filledSegments,
                totals: {
                    off_duty: Math.round(totals.off_duty * 100) / 100,
                    sleeper: Math.round(totals.sleeper * 100) / 100,
                    driving: Math.round(totals.driving * 100) / 100,
                    on_duty: Math.round(totals.on_duty * 100) / 100,
                },
            })
        }

        return logs
    }
}
