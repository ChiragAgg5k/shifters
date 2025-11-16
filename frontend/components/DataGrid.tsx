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
    const totalDistance = trackLength * (track?.numLaps || 1)
    const currentDistance = (agent.lap * trackLength) + (agent.position || 0)
    const progress = (currentDistance / totalDistance) * 100
    return { ...agent, progress }
  })

  // Sort by currentPosition (already correctly calculated in simulation)
  // This properly handles backmarkers by using total race progress
  const sortedAgents = [...agentsWithProgress].sort((a, b) => {
    // DNF cars go to bottom
    const aDnf = a.finished && a.lap < (track?.numLaps || 999)
    const bDnf = b.finished && b.lap < (track?.numLaps || 999)
    if (aDnf !== bDnf) return aDnf ? 1 : -1
    
    // Otherwise sort by currentPosition (which accounts for total progress)
    return a.currentPosition - b.currentPosition
  })

  const formatTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || seconds < 0) return '-'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}.${ms.toString().padStart(2, '0')}s`
  }

  const weather = raceState?.environment?.weather || 'clear'
  const temperature = raceState?.environment?.temperature || 25
  const trackWaterLevel = raceState?.environment?.trackWaterLevel || 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Leaderboard */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">🏁 Live Leaderboard</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {weather === 'rain' ? '🌧️ Rain' : '☀️ Clear'}
            </span>
            <span className="text-muted-foreground">
              🌡️ {temperature}°C
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            <div className="col-span-1">Pos</div>
            <div className="col-span-5">Agent</div>
            <div className="col-span-2">Lap</div>
            <div className="col-span-2">Gap</div>
            <div className="col-span-2">Progress</div>
          </div>
          {sortedAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No race data yet</div>
          ) : (
            <div className="space-y-2">
              {sortedAgents.map((agent: any, index: number) => (
                <div
                  key={agent.id}
                  className="grid grid-cols-12 gap-2 px-3 py-2 bg-card border border-border rounded-md items-center"
                >
                  {/* Position */}
                  <div className="col-span-1 text-xl font-bold text-primary">
                    {index + 1}
                  </div>

                  {/* Agent */}
                  <div className="col-span-5">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {agent.name}
                      {agent.inPit && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold animate-pulse">
                          PIT
                        </span>
                      )}
                      {agent.drsActive && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          DRS
                        </span>
                      )}
                      {agent.inSlipstream && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                          SLIP
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {((agent.speed || 0) * 3.6).toFixed(1)} km/h
                    </div>
                    <div className="flex gap-2 mt-1 text-xs flex-wrap">
                      <span className="text-muted-foreground">
                        🔋 {agent.energy?.toFixed(0) || 0}%
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        🛞 {(100 - (agent.tireWear || 0)).toFixed(0)}%
                        <span className={`px-1 py-0.5 rounded text-xs font-semibold ${agent.tireCompound === 'soft' ? 'bg-red-500/20 text-red-400' :
                            agent.tireCompound === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              agent.tireCompound === 'hard' ? 'bg-white/20 text-white' :
                                agent.tireCompound === 'intermediate' ? 'bg-green-500/20 text-green-400' :
                                  agent.tireCompound === 'wet' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                          }`}>
                          {(agent.tireCompound || 'medium').charAt(0).toUpperCase()}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        🌡️ {agent.tireTemperature?.toFixed(0) || 0}°C
                      </span>
                      {(agent.pitStops || 0) > 0 && (
                        <span className="text-blue-400">
                          🔧 {agent.pitStops}
                        </span>
                      )}
                      {(agent.damageLevel || 0) > 0 && (
                        <span className="text-red-400">
                          💥 {agent.damageLevel?.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lap */}
                  <div className="col-span-2 text-sm font-medium text-foreground">
                    {agent.lap || 0}
                  </div>

                  {/* Gap */}
                  <div className="col-span-2 text-sm font-medium text-foreground">
                    {index === 0 ? (
                      <span className="text-green-400">Leader</span>
                    ) : (
                      <span className={agent.gapToAhead > 1.0 ? 'text-orange-400' : 'text-yellow-400'}>
                        +{agent.gapToAhead?.toFixed(2) || '0.00'}s
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="col-span-2 text-sm text-muted-foreground text-right">
                    {agent.progress?.toFixed(1) || '0.0'}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Safety Car Status */}
      {raceState?.safetyCar?.active && (
        <div className="bg-yellow-500/10 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <h3 className="text-lg font-bold text-yellow-400">SAFETY CAR</h3>
              <p className="text-sm text-yellow-300">
                {raceState.safetyCar.duration} laps remaining
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
              {track ? `${((track.length * track.numLaps) / 1000).toFixed(3)} km` : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Leader Lap Time</span>
            <span className="font-bold text-primary">
              {sortedAgents[0]?.lapTimes?.length > 0 ? formatTime(Math.min(...sortedAgents[0].lapTimes)) : '-'}
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
