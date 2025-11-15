'use client'

import { useEffect, useRef } from 'react'

interface RaceReportProps {
    reportData: any
}

export function RaceReport({ reportData }: RaceReportProps) {
    const tireWearCanvasRef = useRef<HTMLCanvasElement>(null)
    const speedCanvasRef = useRef<HTMLCanvasElement>(null)
    const energyCanvasRef = useRef<HTMLCanvasElement>(null)
    const tireTempCanvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!reportData || !reportData.classification) return

        drawTireWearChart()
        drawSpeedChart()
        drawEnergyChart()
        drawTireTempChart()
    }, [reportData])

    const drawTireWearChart = () => {
        const canvas = tireWearCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const drivers = reportData.classification.slice(0, 5) // Top 5
        const colors = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#3b82f6']

        drawChart(ctx, canvas, drivers, colors, 'Tire Wear Evolution',
            (telemetry) => telemetry.tireWearEnd, 0, 100, '%')
    }

    const drawSpeedChart = () => {
        const canvas = speedCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const drivers = reportData.classification.slice(0, 5)
        const colors = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#3b82f6']

        drawChart(ctx, canvas, drivers, colors, 'Average Speed per Lap',
            (telemetry) => telemetry.avgSpeed * 3.6, 0, 350, 'km/h')
    }

    const drawEnergyChart = () => {
        const canvas = energyCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const drivers = reportData.classification.slice(0, 5)
        const colors = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#3b82f6']

        drawChart(ctx, canvas, drivers, colors, 'Energy Level per Lap',
            (telemetry) => telemetry.energyEnd, 0, 100, '%')
    }

    const drawTireTempChart = () => {
        const canvas = tireTempCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const drivers = reportData.classification.slice(0, 5)
        const colors = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#3b82f6']

        drawChart(ctx, canvas, drivers, colors, 'Tire Temperature per Lap',
            (telemetry) => telemetry.avgTireTemp, 50, 130, '°C')
    }

    const drawChart = (
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        drivers: any[],
        colors: string[],
        title: string,
        dataExtractor: (t: any) => number,
        minY: number,
        maxY: number,
        unit: string
    ) => {
        const padding = 60
        const chartWidth = canvas.width - 2 * padding
        const chartHeight = canvas.height - 2 * padding

        // Background
        ctx.fillStyle = '#0a0f1e'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Title
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(title, canvas.width / 2, 30)

        // Get max laps
        const maxLaps = Math.max(...drivers.map(d => d.telemetry.length))
        if (maxLaps === 0) return

        // Draw axes
        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(padding, padding)
        ctx.lineTo(padding, canvas.height - padding)
        ctx.lineTo(canvas.width - padding, canvas.height - padding)
        ctx.stroke()

        // Y-axis labels
        ctx.fillStyle = '#9ca3af'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'right'
        for (let i = 0; i <= 5; i++) {
            const y = canvas.height - padding - (chartHeight * i / 5)
            const value = minY + (maxY - minY) * i / 5
            ctx.fillText(value.toFixed(0) + unit, padding - 10, y + 5)

            // Grid lines
            ctx.strokeStyle = '#1f2937'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(padding, y)
            ctx.lineTo(canvas.width - padding, y)
            ctx.stroke()
        }

        // X-axis labels
        ctx.textAlign = 'center'
        for (let i = 0; i <= maxLaps; i += Math.ceil(maxLaps / 10)) {
            const x = padding + (chartWidth * i / maxLaps)
            ctx.fillText(`L${i}`, x, canvas.height - padding + 20)
        }

        // Draw lines for each driver
        drivers.forEach((driver, driverIndex) => {
            const color = colors[driverIndex]
            ctx.strokeStyle = color
            ctx.lineWidth = 3
            ctx.beginPath()

            driver.telemetry.forEach((lap: any, lapIndex: number) => {
                const x = padding + (chartWidth * lapIndex / maxLaps)
                const value = dataExtractor(lap)
                const normalizedValue = (value - minY) / (maxY - minY)
                const y = canvas.height - padding - (chartHeight * normalizedValue)

                if (lapIndex === 0) {
                    ctx.moveTo(x, y)
                } else {
                    ctx.lineTo(x, y)
                }
            })

            ctx.stroke()

            // Draw points
            driver.telemetry.forEach((lap: any, lapIndex: number) => {
                const x = padding + (chartWidth * lapIndex / maxLaps)
                const value = dataExtractor(lap)
                const normalizedValue = (value - minY) / (maxY - minY)
                const y = canvas.height - padding - (chartHeight * normalizedValue)

                ctx.fillStyle = color
                ctx.beginPath()
                ctx.arc(x, y, 4, 0, Math.PI * 2)
                ctx.fill()

                // Mark pit stops
                if (lap.pitStopThisLap) {
                    ctx.fillStyle = '#f97316'
                    ctx.beginPath()
                    ctx.arc(x, y, 8, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.fillStyle = '#ffffff'
                    ctx.font = 'bold 10px sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText('P', x, y + 3)
                }
            })
        })

        // Legend
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'left'
        drivers.forEach((driver, index) => {
            const x = padding + index * 150
            const y = canvas.height - 10

            ctx.fillStyle = colors[index]
            ctx.fillRect(x, y - 8, 20, 12)

            ctx.fillStyle = '#ffffff'
            ctx.fillText(driver.name, x + 25, y + 2)
        })
    }

    if (!reportData) {
        return null
    }

    return (
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-2xl font-bold text-primary">📊 Race Report - {reportData.trackName}</h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-input rounded-md p-4">
                    <div className="text-xs text-muted-foreground mb-1">Winner</div>
                    <div className="text-lg font-bold text-green-400">
                        {reportData.classification[0]?.name || 'N/A'}
                    </div>
                </div>
                <div className="bg-input rounded-md p-4">
                    <div className="text-xs text-muted-foreground mb-1">Race Time</div>
                    <div className="text-lg font-bold text-primary">
                        {reportData.raceTime?.toFixed(2)}s
                    </div>
                </div>
                <div className="bg-input rounded-md p-4">
                    <div className="text-xs text-muted-foreground mb-1">Total Laps</div>
                    <div className="text-lg font-bold text-primary">{reportData.totalLaps}</div>
                </div>
                <div className="bg-input rounded-md p-4">
                    <div className="text-xs text-muted-foreground mb-1">Fastest Lap</div>
                    <div className="text-lg font-bold text-yellow-400">
                        {reportData.fastestLaps[0]?.fastestLap.toFixed(2)}s
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {reportData.fastestLaps[0]?.name}
                    </div>
                </div>
            </div>

            {/* Telemetry Charts */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold mb-3 text-foreground">🛞 Tire Wear Evolution</h3>
                    <canvas ref={tireWearCanvasRef} width={900} height={300} className="w-full bg-black rounded-lg" />
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-3 text-foreground">⚡ Speed Analysis</h3>
                    <canvas ref={speedCanvasRef} width={900} height={300} className="w-full bg-black rounded-lg" />
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-3 text-foreground">🔋 Energy Management</h3>
                    <canvas ref={energyCanvasRef} width={900} height={300} className="w-full bg-black rounded-lg" />
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-3 text-foreground">🌡️ Tire Temperature</h3>
                    <canvas ref={tireTempCanvasRef} width={900} height={300} className="w-full bg-black rounded-lg" />
                </div>
            </div>

            {/* Final Classification Table */}
            <div>
                <h3 className="text-lg font-bold mb-3 text-foreground">🏁 Final Classification</h3>
                <div className="space-y-2">
                    {reportData.classification.map((driver: any, index: number) => (
                        <div key={driver.name} className="flex items-center justify-between p-3 bg-input rounded-md">
                            <div className="flex items-center gap-3">
                                <div className="text-2xl font-bold text-primary w-8">{driver.position}</div>
                                <div>
                                    <div className="font-medium text-foreground">{driver.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {driver.pitStops} pit stop{driver.pitStops !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-foreground">{driver.totalTime.toFixed(2)}s</div>
                                {index > 0 && (
                                    <div className="text-sm text-muted-foreground">+{driver.gap.toFixed(2)}s</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
