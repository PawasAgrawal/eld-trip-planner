import { useState } from "react"
import { AlertCircle, ClipboardList } from "lucide-react"
import { TripForm } from "@/components/trip-form"
import { StatsRow } from "@/components/stats-row"
import { EventTimeline } from "@/components/event-timeline"
import { RouteMap } from "@/components/route-map"
import { ELDLogSheet } from "@/components/eld-log-sheet"
import type { TripFormData, TripResult } from "@/lib/types"
import { planTrip } from "@/lib/api"

export default function App() {
    const [result, setResult] = useState<TripResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(data: TripFormData) {
        setIsLoading(true)
        setError(null)
        setResult(null)

        try {
            const tripResult = await planTrip(data)
            setResult(tripResult)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "An unexpected error occurred"
            )
        } finally {
            setIsLoading(false)
        }
    }

    console.log(result);


    return (
        <main className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                            <ClipboardList className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-semibold text-foreground tracking-tight">
                            ELD Trip Planner
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                        FMCSA HOS Compliant
                    </span>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-6">
                {/* Error Banner */}
                {error && (
                    <div className="mb-6 rounded-lg border border-primary/40 bg-primary/10 p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-card-foreground">
                                Route Planning Error
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Two-column grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Column: Form + Stats + Timeline */}
                    <div className="flex flex-col gap-6 lg:col-span-5">
                        <TripForm onSubmit={handleSubmit} isLoading={isLoading} />
                        <StatsRow result={result} />
                        <EventTimeline events={result?.events || []} />
                    </div>

                    {/* Right Column: Map + ELD Logs */}
                    <div className="flex flex-col gap-6 lg:col-span-7">
                        <RouteMap result={result} />

                        {/* ELD Daily Log Sheets */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <ClipboardList className="h-5 w-5 text-primary" />
                                <h2 className="text-sm font-semibold text-foreground">
                                    ELD Daily Log Sheets
                                </h2>
                            </div>

                            {result && result.daily_logs?.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {result.daily_logs.map((log) => (
                                        <ELDLogSheet key={log.date} log={log} />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center justify-center">
                                    <ClipboardList className="h-10 w-10 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Plan a trip to generate ELD log sheets
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
