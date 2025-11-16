'use client'

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts'

interface RaceReportProps {
    reportData: any
}

export function RaceReport({ reportData }: RaceReportProps) {
    if (!reportData || !reportData.classification) {
        return null
    }

    const drivers = reportData.classification.slice(0, 5)
    const colors = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#3b82f6']

    // Prepare telemetry data for charts (exclude pit stop laps)
    const prepareTelemetryData = () => {
        const maxLaps = Math.max(...drivers.map((d: any) => d.telemetry?.length || 0))
        const data = []

        for (let lap = 0; lap < maxLaps; lap++) {
            const lapData: any = { lap: lap + 1 }
            let hasValidData = false

            drivers.forEach((driver: any) => {
                if (driver.telemetry && driver.telemetry[lap]) {
                    const telemetry = driver.telemetry[lap]
                    
                    // Skip pit stop laps (avgSpeed will be 0 or very low during pit stops)
                    // Only include laps with meaningful speed data
                    if (telemetry.avgSpeed > 5) { // Minimum 18 km/h average speed
                        lapData[`${driver.name}_wear`] = telemetry.tireWearEnd || 0
                        lapData[`${driver.name}_speed`] = (telemetry.avgSpeed || 0) * 3.6
                        lapData[`${driver.name}_energy`] = telemetry.energyEnd || 0
                        lapData[`${driver.name}_temp`] = telemetry.avgTireTemp || 0
                        lapData[`${driver.name}_compound`] = telemetry.tireCompound || 'medium'
                        
                        // Mark stint start (new compound or lap 1)
                        const prevLap = lap > 0 ? driver.telemetry[lap - 1] : null
                        lapData[`${driver.name}_stintStart`] = lap === 0 || 
                            (prevLap && prevLap.tireCompound !== telemetry.tireCompound)
                        
                        hasValidData = true
                    }
                }
            })
            
            // Only add lap if at least one driver has valid data
            if (hasValidData) {
                data.push(lapData)
            }
        }
        return data
    }

    const telemetryData = prepareTelemetryData()

    // Custom dot for tire compound changes
    const TireCompoundDot = (props: any) => {
        const { cx, cy, payload, dataKey } = props
        const driverName = dataKey.replace('_wear', '')
        const isStintStart = payload[`${driverName}_stintStart`]
        const compound = payload[`${driverName}_compound`]
        
        if (!isStintStart) return null
        
        // Tire compound colors
        const compoundColors: Record<string, string> = {
            soft: '#ef4444',      // Red
            medium: '#fbbf24',    // Yellow
            hard: '#ffffff',      // White
            intermediate: '#4ade80', // Green
            wet: '#3b82f6'        // Blue
        }
        
        return (
            <circle
                cx={cx}
                cy={cy}
                r={5}
                fill={compoundColors[compound] || '#fbbf24'}
                stroke="#000"
                strokeWidth={1}
            />
        )
    }

    // Prepare classification data for bar chart
    const classificationData = drivers.map((driver: any) => ({
        name: driver.name,
        time: driver.totalTime,
        gap: driver.gap || 0,
        pitStops: driver.pitStops,
    }))

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
                {/* Tire Wear Evolution */}
                <div className="bg-input/50 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 text-foreground">🛞 Tire Wear Evolution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={telemetryData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="lap" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#ffffff' }}
                                formatter={(value: number) => typeof value === 'number' ? value.toFixed(4) : value}
                            />
                            <Legend />
                            {drivers.map((driver: any, index: number) => (
                                <Line
                                    key={`wear-${driver.name}`}
                                    type="monotone"
                                    dataKey={`${driver.name}_wear`}
                                    stroke={colors[index]}
                                    name={driver.name}
                                    dot={<TireCompoundDot />}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Speed Analysis */}
                <div className="bg-input/50 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 text-foreground">⚡ Speed Analysis (km/h)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={telemetryData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="lap" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" domain={[0, 350]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#ffffff' }}
                                formatter={(value: number) => typeof value === 'number' ? value.toFixed(4) : value}
                            />
                            <Legend />
                            {drivers.map((driver: any, index: number) => (
                                <Line
                                    key={`speed-${driver.name}`}
                                    type="monotone"
                                    dataKey={`${driver.name}_speed`}
                                    stroke={colors[index]}
                                    name={driver.name}
                                    dot={false}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Energy Management */}
                <div className="bg-input/50 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 text-foreground">🔋 Energy Management (%)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={telemetryData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="lap" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#ffffff' }}
                                formatter={(value: number) => typeof value === 'number' ? value.toFixed(4) : value}
                            />
                            <Legend />
                            {drivers.map((driver: any, index: number) => (
                                <Line
                                    key={`energy-${driver.name}`}
                                    type="monotone"
                                    dataKey={`${driver.name}_energy`}
                                    stroke={colors[index]}
                                    name={driver.name}
                                    dot={false}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Tire Temperature */}
                <div className="bg-input/50 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 text-foreground">🌡️ Tire Temperature (°C)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={telemetryData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="lap" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" domain={[50, 130]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#ffffff' }}
                                formatter={(value: number) => typeof value === 'number' ? value.toFixed(4) : value}
                            />
                            <Legend />
                            {drivers.map((driver: any, index: number) => (
                                <Line
                                    key={`temp-${driver.name}`}
                                    type="monotone"
                                    dataKey={`${driver.name}_temp`}
                                    stroke={colors[index]}
                                    name={driver.name}
                                    dot={false}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Final Times Bar Chart */}
                <div className="bg-input/50 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 text-foreground">⏱️ Final Race Times</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={classificationData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#ffffff' }}
                                formatter={(value: number) => typeof value === 'number' ? value.toFixed(4) : value}
                            />
                            <Bar dataKey="time" fill="#3b82f6" name="Total Time (s)" />
                        </BarChart>
                    </ResponsiveContainer>
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
