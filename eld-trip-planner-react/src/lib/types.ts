export interface TripFormData {
    current_location: string
    pickup_location: string
    dropoff_location: string
    current_cycle_used: number
}

export interface GeoLocation {
    lat: number
    lon: number
    display_name: string
}

export interface RouteData {
    distance_miles: number
    duration_hours: number
    geometry: [number, number][]
}

export interface TripEvent {
    type: "driving" | "rest" | "break" | "fuel" | "on_duty" | "pickup" | "dropoff"
    start: string
    end: string
    duration_hours: number
    label: string
    miles?: number
    lat?: number
    lon?: number
}

export interface DailyLogSegment {
    start_hour: number
    end_hour: number
    status: "OFF" | "SB" | "D" | "ON"
    label: string
}

export interface DailyLog {
    date: string
    segments: DailyLogSegment[]
    totals: {
        off_duty: number
        sleeper: number
        driving: number
        on_duty: number
    }
}

export interface TripResult {
    locations: {
        current: GeoLocation
        pickup: GeoLocation
        dropoff: GeoLocation
    }
    routes: {
        leg1: RouteData
        leg2: RouteData
    }
    total_distance_miles: number
    total_driving_hours: number
    total_days: number
    total_rest_hours: number
    events: TripEvent[]
    daily_logs: DailyLog[]
}
