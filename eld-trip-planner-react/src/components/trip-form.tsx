import { MapPin, Package, Flag, Clock, Truck, ArrowRight, Loader2 } from "lucide-react"
import type { TripFormData } from "@/lib/types"

interface TripFormProps {
    onSubmit: (data: TripFormData) => void
    isLoading: boolean
}

export function TripForm({ onSubmit, isLoading }: TripFormProps) {
    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
            current_location: formData.get("current_location") as string,
            pickup_location: formData.get("pickup_location") as string,
            dropoff_location: formData.get("dropoff_location") as string,
            current_cycle_used: parseFloat(formData.get("current_cycle_used") as string) || 0,
        })
    }

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <Truck className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-semibold text-card-foreground font-sans">
                        ELD Trip Planner
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground ml-9">
                    HOS-Compliant Route Planning
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="current_location" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-chart-3" />
                        Current Location
                    </label>
                    <input
                        id="current_location"
                        name="current_location"
                        type="text"
                        required
                        placeholder="Chicago, IL"
                        className="rounded-md border border-border bg-input px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="pickup_location" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                        <Package className="h-4 w-4 text-chart-2" />
                        Pickup Location
                    </label>
                    <input
                        id="pickup_location"
                        name="pickup_location"
                        type="text"
                        required
                        placeholder="St. Louis, MO"
                        className="rounded-md border border-border bg-input px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="dropoff_location" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                        <Flag className="h-4 w-4 text-primary" />
                        Dropoff Location
                    </label>
                    <input
                        id="dropoff_location"
                        name="dropoff_location"
                        type="text"
                        required
                        placeholder="Dallas, TX"
                        className="rounded-md border border-border bg-input px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="current_cycle_used" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-chart-4" />
                        Current Cycle Used (hrs)
                    </label>
                    <input
                        id="current_cycle_used"
                        name="current_cycle_used"
                        type="number"
                        min="0"
                        max="70"
                        step="0.5"
                        defaultValue="0"
                        placeholder="0"
                        className="rounded-md border border-border bg-input px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Calculating Route...
                        </>
                    ) : (
                        <>
                            Plan My Trip
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
