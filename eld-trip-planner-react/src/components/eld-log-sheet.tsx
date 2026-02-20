import { useEffect, useRef } from "react"
import type { DailyLog } from "@/lib/types"

interface ELDLogSheetProps {
    log: DailyLog
}

const STATUS_ROWS = ["OFF", "SB", "D", "ON"] as const
const STATUS_LABELS = ["Off Duty", "Sleeper Berth", "Driving", "On Duty (N/D)"]
const STATUS_COLORS: Record<string, string> = {
    OFF: "#6b7280",
    SB: "#8b5cf6",
    D: "#ef4444",
    ON: "#22c55e",
}

const CANVAS_WIDTH = 1050
const CANVAS_HEIGHT = 220
const LEFT_MARGIN = 100
const RIGHT_MARGIN = 20
const TOP_MARGIN = 25
const BOTTOM_MARGIN = 10
const GRID_WIDTH = CANVAS_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
const GRID_HEIGHT = CANVAS_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN
const ROW_HEIGHT = GRID_HEIGHT / 4
const HOUR_WIDTH = GRID_WIDTH / 24

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00")
    return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}

export function ELDLogSheet({ log }: ELDLogSheetProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Set canvas size for high DPI
        const dpr = window.devicePixelRatio || 1
        canvas.width = CANVAS_WIDTH * dpr
        canvas.height = CANVAS_HEIGHT * dpr
        ctx.scale(dpr, dpr)
        canvas.style.width = `${CANVAS_WIDTH}px`
        canvas.style.height = `${CANVAS_HEIGHT}px`

        // Background
        ctx.fillStyle = "#0f1629"
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        // Draw status labels on the left
        ctx.fillStyle = "#94a3b8"
        ctx.font = "11px Inter, system-ui, sans-serif"
        ctx.textAlign = "right"
        ctx.textBaseline = "middle"

        for (let i = 0; i < 4; i++) {
            const y = TOP_MARGIN + i * ROW_HEIGHT + ROW_HEIGHT / 2
            ctx.fillText(STATUS_LABELS[i], LEFT_MARGIN - 10, y)
        }

        // Draw grid lines
        ctx.strokeStyle = "#1e293b"
        ctx.lineWidth = 0.5

        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
            const y = TOP_MARGIN + i * ROW_HEIGHT
            ctx.beginPath()
            ctx.moveTo(LEFT_MARGIN, y)
            ctx.lineTo(LEFT_MARGIN + GRID_WIDTH, y)
            ctx.stroke()
        }

        // Vertical hour lines and labels
        ctx.fillStyle = "#64748b"
        ctx.font = "9px Inter, system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "top"

        const hourLabels = [
            "M", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
            "N", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "M"
        ]

        for (let h = 0; h <= 24; h++) {
            const x = LEFT_MARGIN + h * HOUR_WIDTH
            ctx.strokeStyle = h % 6 === 0 ? "#334155" : "#1e293b"
            ctx.lineWidth = h % 6 === 0 ? 1 : 0.5
            ctx.beginPath()
            ctx.moveTo(x, TOP_MARGIN)
            ctx.lineTo(x, TOP_MARGIN + GRID_HEIGHT)
            ctx.stroke()

            // Hour label
            ctx.fillStyle = h % 6 === 0 ? "#94a3b8" : "#475569"
            ctx.fillText(hourLabels[h], x, TOP_MARGIN + GRID_HEIGHT + 3)
        }

        // Draw segments
        for (const segment of log.segments) {
            const rowIndex = STATUS_ROWS.indexOf(segment.status as typeof STATUS_ROWS[number])
            if (rowIndex === -1) continue

            const x1 = LEFT_MARGIN + segment.start_hour * HOUR_WIDTH
            const x2 = LEFT_MARGIN + segment.end_hour * HOUR_WIDTH
            const y = TOP_MARGIN + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

            const color = STATUS_COLORS[segment.status] || "#6b7280"

            // Draw horizontal status line
            ctx.strokeStyle = color
            ctx.lineWidth = 3
            ctx.lineCap = "round"
            ctx.beginPath()
            ctx.moveTo(x1, y)
            ctx.lineTo(x2, y)
            ctx.stroke()
        }

        // Draw vertical connectors between status changes
        const sortedSegments = [...log.segments].sort(
            (a, b) => a.start_hour - b.start_hour
        )

        for (let i = 1; i < sortedSegments.length; i++) {
            const prev = sortedSegments[i - 1]
            const curr = sortedSegments[i]

            if (prev.status === curr.status) continue

            const prevRow = STATUS_ROWS.indexOf(prev.status as typeof STATUS_ROWS[number])
            const currRow = STATUS_ROWS.indexOf(curr.status as typeof STATUS_ROWS[number])

            if (prevRow === -1 || currRow === -1) continue

            const x = LEFT_MARGIN + curr.start_hour * HOUR_WIDTH
            const y1 = TOP_MARGIN + prevRow * ROW_HEIGHT + ROW_HEIGHT / 2
            const y2 = TOP_MARGIN + currRow * ROW_HEIGHT + ROW_HEIGHT / 2

            ctx.strokeStyle = "#475569"
            ctx.lineWidth = 1
            ctx.setLineDash([2, 2])
            ctx.beginPath()
            ctx.moveTo(x, y1)
            ctx.lineTo(x, y2)
            ctx.stroke()
            ctx.setLineDash([])
        }
    }, [log])

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">
                {formatDate(log.date)}
            </h3>

            <div className="overflow-x-auto">
                <canvas
                    ref={canvasRef}
                    className="rounded"
                    style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
                />
            </div>

            <div className="grid grid-cols-4 gap-3 mt-3">
                <div className="flex flex-col items-center rounded-md bg-secondary/50 px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">Off Duty</span>
                    <span className="text-sm font-semibold text-card-foreground">
                        {log.totals?.off_duty.toFixed(1)}h
                    </span>
                </div>
                <div className="flex flex-col items-center rounded-md bg-secondary/50 px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">Sleeper</span>
                    <span className="text-sm font-semibold text-card-foreground">
                        {log.totals?.sleeper.toFixed(1)}h
                    </span>
                </div>
                <div className="flex flex-col items-center rounded-md bg-secondary/50 px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">Driving</span>
                    <span className="text-sm font-semibold text-primary">
                        {log.totals?.driving.toFixed(1)}h
                    </span>
                </div>
                <div className="flex flex-col items-center rounded-md bg-secondary/50 px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">On Duty</span>
                    <span className="text-sm font-semibold text-chart-3">
                        {log.totals?.on_duty.toFixed(1)}h
                    </span>
                </div>
            </div>
        </div>
    )
}
