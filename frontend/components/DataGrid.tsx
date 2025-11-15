'use client'

interface DataGridProps {
  raceState: any
}

export function DataGrid({ raceState }: DataGridProps) {
  // Use agents data which has all racing telemetry, sorted by position
  const agents = raceState?.agents || []
  const track = raceState?.environment?.track
  
  // Calculate progress for each agent
  const agentsWithProgress = agents.map((agent: any) => {
    const trackLength = track?.length || 1
    const totalDistance = trackLength * (track?.num_laps || 1)
    const currentDistance = (agent.lap * trackLength) + (agent.position || 0)
    const progress = (currentDistance / totalDistance) * 100
    return { ...agent, progress }
  })
  
  const sortedAgents = [...agentsWithProgress].sort((a, b) => {
    // Sort by: finished first, then by lap (desc), then by position (desc)
    if (a.finished !== b.finished) return a.finished ? 1 : -1
    if (a.lap !== b.lap) return b.lap - a.lap
    return b.position - a.position
  })

  const formatTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || seconds < 0) return '-'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}.${ms.toString().padStart(2, '0')}s`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Leaderboard */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-primary mb-4">🏁 Live Leaderboard</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            <div className="col-span-1">Rank</div>
            <div className="col-span-6">Agent</div>
            <div className="col-span-2">Lap</div>
            <div className="col-span-3">Progress</div>
          </div>
          {sortedAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No race data yet</div>
          ) : (
            <div className="space-y-2">
              {sortedAgents.map((agent: any, index: number) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 bg-card border border-border rounded-md"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl font-bold text-primary w-8">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {agent.name}
                        {agent.drs_active && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            DRS
                          </span>
                        )}
                        {agent.in_slipstream && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                            SLIP
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Lap {agent.lap || 0} • {agent.speed?.toFixed(1) || '0.0'} m/s
                      </div>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-muted-foreground">
                          🔋 {agent.energy?.toFixed(0) || 0}%
                        </span>
                        <span className="text-muted-foreground">
                          🛞 {(100 - (agent.tire_wear || 0)).toFixed(0)}%
                        </span>
                        <span className="text-muted-foreground">
                          🌡️ {agent.tire_temperature?.toFixed(0) || 0}°C
                        </span>
                        {(agent.damage_level || 0) > 0 && (
                          <span className="text-red-400">
                            💥 {agent.damage_level?.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      {formatTime(agent.total_time || agent.time)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {agent.progress?.toFixed(1) || '0.0'}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Safety Car Status */}
      {raceState?.safety_car?.active && (
        <div className="bg-yellow-500/10 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <h3 className="text-lg font-bold text-yellow-400">SAFETY CAR</h3>
              <p className="text-sm text-yellow-300">
                {raceState.safety_car.laps_remaining} laps remaining
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Race Statistics */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-primary mb-4">📊 Race Statistics</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Track Length</span>
            <span className="font-bold text-primary">
              {track ? `${(track.length / 1000).toFixed(3)} km` : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Total Distance</span>
            <span className="font-bold text-primary">
              {track ? `${(track.total_distance / 1000).toFixed(3)} km` : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Leader Lap Time</span>
            <span className="font-bold text-primary">
              {sortedAgents[0]?.best_lap_time ? formatTime(sortedAgents[0].best_lap_time) : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-sm text-muted-foreground">Leader Speed</span>
            <span className="font-bold text-primary">
              {sortedAgents[0]?.speed ? `${(sortedAgents[0].speed * 3.6).toFixed(2)} km/h` : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
