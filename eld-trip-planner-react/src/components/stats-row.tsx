import { Route, CalendarDays, Timer, BedDouble } from "lucide-react"
import type { TripResult } from "@/lib/types"

interface StatsRowProps {
    result: TripResult | null
}

export function StatsRow({ result }: StatsRowProps) {
    const stats = [
        {
            label: "Total Miles",
            value: result ? `${result.total_distance_miles.toLocaleString()} mi` : "--",
            icon: Route,
            color: "text-primary",
        },
        {
            label: "Days on Road",
            value: result ? `${result.total_days}` : "--",
            icon: CalendarDays,
            color: "text-chart-2",
        },
        {
            label: "Driving Time",
            value: result ? `${result.total_driving_hours} hrs` : "--",
            icon: Timer,
            color: "text-chart-3",
        },
        {
            label: "Rest Time",
            value: result ? `${result.total_rest_hours} hrs` : "--",
            icon: BedDouble,
            color: "text-chart-5",
        },
    ]

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-card p-3 flex flex-col items-center gap-1"
                >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                    <span className="text-sm font-semibold text-card-foreground">
                        {stat.value}
                    </span>
                </div>
            ))}
        </div>
    )
}
