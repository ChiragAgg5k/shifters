'use client'

import { useState, useEffect } from 'react'
import { Play, Square, RotateCcw } from 'lucide-react'
import { RaceConfig } from '@/lib/hooks/useRaceSimulation'

interface Circuit {
  id: string
  name: string
  location: string
  coordinates: number[][]
}

interface ControlDeckProps {
  raceActive: boolean
  setRaceActive: (active: boolean) => void
  startRace: (config: RaceConfig) => void
  stopRace: () => void
  updateSpeedMultiplier?: (multiplier: number) => void
  updateTrackTemperature?: (temp: number) => void
  updateWeather?: (weather: string) => void
  updateRainProbability?: (probability: number) => void
  updateVehicleMaxSpeed?: (vehicleIndex: number, maxSpeed: number) => void
  updateVehicleAcceleration?: (vehicleIndex: number, acceleration: number) => void
  updateVehicleDnfProbability?: (vehicleIndex: number, dnfProbability: number) => void
  updateVehicleCorneringSkill?: (vehicleIndex: number, corneringSkill: number) => void
}

export function ControlDeck({ 
  raceActive, 
  startRace, 
  stopRace,
  updateSpeedMultiplier,
  updateTrackTemperature,
  updateWeather,
  updateRainProbability,
  updateVehicleMaxSpeed,
  updateVehicleAcceleration,
  updateVehicleDnfProbability,
  updateVehicleCorneringSkill
}: ControlDeckProps) {
  const [numAgents, setNumAgents] = useState(5)
  const [numLaps, setNumLaps] = useState(3)
  const [circuit, setCircuit] = useState('mc-1929')
  const [trackTemp, setTrackTemp] = useState(35)
  const [rainProbability, setRainProbability] = useState(0)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [circuits, setCircuits] = useState<Circuit[]>([])
  
  // Agent customization
  const [customizeAgents, setCustomizeAgents] = useState(false)
  const [agentMaxSpeed, setAgentMaxSpeed] = useState(90)
  const [agentAcceleration, setAgentAcceleration] = useState(12.5)
  const [agentDnfProbability, setAgentDnfProbability] = useState(2)
  const [agentCorneringSkill, setAgentCorneringSkill] = useState(1.2)
  
  // Per-agent customization
  const [perAgentCustomize, setPerAgentCustomize] = useState(false)
  const [perAgentConfigs, setPerAgentConfigs] = useState<Record<number, { maxSpeed: number; acceleration: number; dnfProbability: number; corneringSkill: number }>>({})
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null)

  // Load circuits from public folder
  useEffect(() => {
    const loadCircuits = async () => {
      try {
        const response = await fetch('/data/circuits/f1-circuits.geojson')
        const data = await response.json()
        // Extract circuits from GeoJSON FeatureCollection
        if (data.features) {
          const loadedCircuits = data.features.map((feature: any) => ({
            id: feature.properties.id,
            name: feature.properties.Name,
            location: feature.properties.Location,
            coordinates: feature.geometry.coordinates
          }))
          setCircuits(loadedCircuits)
        }
      } catch (error) {
        console.error('Failed to load circuits:', error)
      }
    }
    loadCircuits()
  }, [])

  const handleStartRace = () => {
    const circuitData = circuits.find(c => c.id === circuit)
    if (!circuitData) {
      console.error('Circuit not found:', circuit)
      return
    }

    // Convert per-agent configs to the format expected by RaceConfig
    const perAgentCfg = perAgentCustomize ? Object.entries(perAgentConfigs).reduce((acc, [idx, cfg]) => {
      acc[parseInt(idx)] = {
        maxSpeed: cfg.maxSpeed,
        acceleration: cfg.acceleration,
        dnfProbability: cfg.dnfProbability / 100
      }
      return acc
    }, {} as Record<number, any>) : undefined

    startRace({
      numAgents,
      numLaps,
      trackData: {
        name: circuitData.name,
        coordinates: circuitData.coordinates
      },
      trackTemperature: trackTemp,
      rainProbability: rainProbability / 100, // Convert percentage to 0-1
      speedMultiplier,
      agentConfig: customizeAgents ? {
        maxSpeed: agentMaxSpeed,
        acceleration: agentAcceleration,
        dnfProbability: agentDnfProbability / 100 // Convert percentage to 0-1
      } : undefined,
      perAgentConfig: perAgentCfg
    })
  }

  const handleStopRace = () => {
    stopRace()
  }

  const resetView = () => {
    window.location.reload()
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Number of Agents</label>
          <input
            type="number"
            min="2"
            max="20"
            value={numAgents}
            onChange={(e) => setNumAgents(parseInt(e.target.value))}
            disabled={raceActive}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Number of Laps</label>
          <input
            type="number"
            min="1"
            max="100"
            value={numLaps}
            onChange={(e) => setNumLaps(parseInt(e.target.value))}
            disabled={raceActive}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Circuit</label>
          <select
            value={circuit}
            onChange={(e) => setCircuit(e.target.value)}
            disabled={raceActive}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="mc-1929">Circuit de Monaco</option>
            <option value="gb-1948">Silverstone Circuit</option>
            <option value="be-1925">Circuit de Spa-Francorchamps</option>
            <option value="au-1953">Albert Park Circuit</option>
            <option value="it-1922">Autodromo Nazionale Monza</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Track Temperature: {trackTemp}°C
          </label>
          <input
            type="range"
            min="10"
            max="60"
            value={trackTemp}
            onChange={(e) => {
              const newTemp = parseInt(e.target.value)
              setTrackTemp(newTemp)
              if (raceActive && updateTrackTemperature) {
                updateTrackTemperature(newTemp)
              }
            }}
            className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Rain Probability: {rainProbability}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={rainProbability}
            onChange={(e) => {
              const newRain = parseInt(e.target.value)
              setRainProbability(newRain)
              if (raceActive && updateRainProbability) {
                updateRainProbability(newRain / 100)
              }
            }}
            className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Simulation Speed: {speedMultiplier}x
          </label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={speedMultiplier}
            onChange={(e) => {
              const newSpeed = parseFloat(e.target.value)
              setSpeedMultiplier(newSpeed)
              if (raceActive && updateSpeedMultiplier) {
                updateSpeedMultiplier(newSpeed)
              }
            }}
            className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-muted-foreground text-center">0.5x - 4x speed</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <div className="px-3 py-2 bg-input border border-border rounded-md text-foreground flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${raceActive ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
            <span className="text-sm font-medium">{raceActive ? 'RACING' : 'IDLE'}</span>
          </div>
        </div>
      </div>

      {/* Agent Customization Section */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="customize-agents"
            checked={customizeAgents}
            onChange={(e) => setCustomizeAgents(e.target.checked)}
            disabled={raceActive}
            className="w-4 h-4 rounded border-border cursor-pointer disabled:opacity-50"
          />
          <label htmlFor="customize-agents" className="text-sm font-medium text-muted-foreground cursor-pointer">
            Customize Agent Performance
          </label>
        </div>

        {customizeAgents && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-input/50 p-4 rounded-md">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Max Speed: {agentMaxSpeed.toFixed(1)} m/s
              </label>
              <input
                type="range"
                min="70"
                max="110"
                step="1"
                value={agentMaxSpeed}
                onChange={(e) => {
                  const newSpeed = parseFloat(e.target.value)
                  setAgentMaxSpeed(newSpeed)
                  if (raceActive && updateVehicleMaxSpeed) {
                    // Update all vehicles with new speed
                    for (let i = 0; i < numAgents; i++) {
                      updateVehicleMaxSpeed(i, newSpeed)
                    }
                  }
                }}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground text-center">70 - 110 m/s</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Acceleration: {agentAcceleration.toFixed(2)} m/s²
              </label>
              <input
                type="range"
                min="8"
                max="16"
                step="0.1"
                value={agentAcceleration}
                onChange={(e) => {
                  const newAccel = parseFloat(e.target.value)
                  setAgentAcceleration(newAccel)
                  if (raceActive && updateVehicleAcceleration) {
                    // Update all vehicles with new acceleration
                    for (let i = 0; i < numAgents; i++) {
                      updateVehicleAcceleration(i, newAccel)
                    }
                  }
                }}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground text-center">8 - 16 m/s²</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                DNF Probability: {agentDnfProbability}%
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={agentDnfProbability}
                onChange={(e) => {
                  const newDnf = parseFloat(e.target.value)
                  setAgentDnfProbability(newDnf)
                  if (raceActive && updateVehicleDnfProbability) {
                    // Update all vehicles with new DNF probability
                    for (let i = 0; i < numAgents; i++) {
                      updateVehicleDnfProbability(i, newDnf / 100)
                    }
                  }
                }}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground text-center">0 - 10%</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Cornering Skill: {agentCorneringSkill.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={agentCorneringSkill}
                onChange={(e) => {
                  const newSkill = parseFloat(e.target.value)
                  setAgentCorneringSkill(newSkill)
                  if (raceActive && updateVehicleCorneringSkill) {
                    // Update all vehicles with new cornering skill
                    for (let i = 0; i < numAgents; i++) {
                      updateVehicleCorneringSkill(i, newSkill)
                    }
                  }
                }}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground text-center">0.5 - 2.0</div>
            </div>
          </div>
        )}
      </div>

      {/* Per-Agent Customization Section */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="customize-per-agent"
            checked={perAgentCustomize}
            onChange={(e) => setPerAgentCustomize(e.target.checked)}
            disabled={raceActive}
            className="w-4 h-4 rounded border-border cursor-pointer disabled:opacity-50"
          />
          <label htmlFor="customize-per-agent" className="text-sm font-medium text-muted-foreground cursor-pointer">
            Customize Each Agent Individually
          </label>
        </div>

        {perAgentCustomize && (
          <div className="space-y-2 bg-input/50 p-4 rounded-md max-h-64 overflow-y-auto">
            {Array.from({ length: numAgents }).map((_, i) => (
              <div key={i} className="border border-border rounded-md p-3">
                <button
                  onClick={() => setExpandedAgent(expandedAgent === i ? null : i)}
                  className="w-full text-left flex items-center justify-between hover:bg-input/50 p-2 rounded transition-colors"
                >
                  <span className="font-medium text-sm">Agent {i + 1}</span>
                  <span className="text-xs text-muted-foreground">
                    {perAgentConfigs[i] ? '✓ Configured' : 'Default'}
                  </span>
                </button>

                {expandedAgent === i && (
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Speed: {(perAgentConfigs[i]?.maxSpeed ?? 90).toFixed(1)} m/s
                      </label>
                      <input
                        type="range"
                        min="70"
                        max="110"
                        step="1"
                        value={perAgentConfigs[i]?.maxSpeed ?? 90}
                        onChange={(e) => {
                          const newSpeed = parseFloat(e.target.value)
                          setPerAgentConfigs({
                            ...perAgentConfigs,
                            [i]: { ...perAgentConfigs[i], maxSpeed: newSpeed }
                          })
                          if (raceActive && updateVehicleMaxSpeed) {
                            updateVehicleMaxSpeed(i, newSpeed)
                          }
                        }}
                        className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Accel: {(perAgentConfigs[i]?.acceleration ?? 12.5).toFixed(2)} m/s²
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="16"
                        step="0.1"
                        value={perAgentConfigs[i]?.acceleration ?? 12.5}
                        onChange={(e) => {
                          const newAccel = parseFloat(e.target.value)
                          setPerAgentConfigs({
                            ...perAgentConfigs,
                            [i]: { ...perAgentConfigs[i], acceleration: newAccel }
                          })
                          if (raceActive && updateVehicleAcceleration) {
                            updateVehicleAcceleration(i, newAccel)
                          }
                        }}
                        className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        DNF: {(perAgentConfigs[i]?.dnfProbability ?? 2).toFixed(1)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={perAgentConfigs[i]?.dnfProbability ?? 2}
                        onChange={(e) => {
                          const newDnf = parseFloat(e.target.value)
                          setPerAgentConfigs({
                            ...perAgentConfigs,
                            [i]: { ...perAgentConfigs[i], dnfProbability: newDnf }
                          })
                          if (raceActive && updateVehicleDnfProbability) {
                            updateVehicleDnfProbability(i, newDnf / 100)
                          }
                        }}
                        className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Skill: {(perAgentConfigs[i]?.corneringSkill ?? 1.2).toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={perAgentConfigs[i]?.corneringSkill ?? 1.2}
                        onChange={(e) => {
                          const newSkill = parseFloat(e.target.value)
                          setPerAgentConfigs({
                            ...perAgentConfigs,
                            [i]: { ...perAgentConfigs[i], corneringSkill: newSkill }
                          })
                          if (raceActive && updateVehicleCorneringSkill) {
                            updateVehicleCorneringSkill(i, newSkill)
                          }
                        }}
                        className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleStartRace}
          disabled={raceActive}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={18} />
          Start Race
        </button>

        <button
          onClick={handleStopRace}
          disabled={!raceActive}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Square size={18} />
          Stop Race
        </button>

        <button
          onClick={resetView}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80 transition-colors"
        >
          <RotateCcw size={18} />
          Reset
        </button>
      </div>
    </div>
  )
}
