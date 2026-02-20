import type { TripEvent } from "@/lib/types"

interface EventTimelineProps {
    events: TripEvent[]
}

const EVENT_COLORS: Record<string, string> = {
    driving: "bg-primary",
    rest: "bg-chart-2",
    break: "bg-chart-5",
    fuel: "bg-chart-4",
    on_duty: "bg-chart-3",
    pickup: "bg-chart-2",
    dropoff: "bg-primary",
}

const EVENT_BORDER_COLORS: Record<string, string> = {
    driving: "border-primary",
    rest: "border-chart-2",
    break: "border-chart-5",
    fuel: "border-chart-4",
    on_duty: "border-chart-3",
    pickup: "border-chart-2",
    dropoff: "border-primary",
}

function formatTime(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    })
}

function formatDuration(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function EventTimeline({ events }: EventTimelineProps) {
    if (events.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-card-foreground mb-4">
                    Route Events
                </h2>
                <p className="text-sm text-muted-foreground text-center py-8">
                    Enter trip details to see route events
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">
                Route Events
            </h2>
            <div className="flex flex-col gap-0">
                {events.map((event, i) => (
                    <div key={i} className="flex gap-3">
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`h-3 w-3 rounded-full ${EVENT_COLORS[event.type] || "bg-muted-foreground"} shrink-0 mt-1 ring-2 ring-background`}
                            />
                            {i < events.length - 1 && (
                                <div className={`w-0.5 flex-1 min-h-8 ${EVENT_COLORS[event.type] || "bg-muted-foreground"} opacity-30`} />
                            )}
                        </div>

                        {/* Event content */}
                        <div className={`flex-1 pb-4 border-l-0 ${i < events.length - 1 ? "" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-card-foreground leading-tight">
                                        {event.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {formatTime(event.start)}
                                    </p>
                                    {event.miles && event.miles > 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                            {event.miles.toFixed(1)} miles
                                        </p>
                                    ) : null}
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${EVENT_BORDER_COLORS[event.type] || "border-muted-foreground"} text-card-foreground shrink-0`}>
                                    {formatDuration(event.duration_hours)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
