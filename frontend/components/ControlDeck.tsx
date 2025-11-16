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
  updateGlobalDnfProbability?: (dnfProbability: number) => void
  updateVehicleMaxSpeed?: (vehicleIndex: number, maxSpeed: number) => void
  updateVehicleAcceleration?: (vehicleIndex: number, acceleration: number) => void
  updateVehicleDnfProbability?: (vehicleIndex: number, dnfProbability: number) => void
  updateVehicleCorneringSkill?: (vehicleIndex: number, corneringSkill: number) => void
  updateVehicleDifferentialPreload?: (vehicleIndex: number, differentialPreload: number) => void
  updateVehicleEngineBraking?: (vehicleIndex: number, engineBraking: number) => void
  updateVehicleBrakeBalance?: (vehicleIndex: number, brakeBalance: number) => void
}

export function ControlDeck({
  raceActive,
  startRace,
  stopRace,
  updateSpeedMultiplier,
  updateTrackTemperature,
  updateRainProbability,
  updateGlobalDnfProbability,
  updateVehicleMaxSpeed,
  updateVehicleAcceleration,
  updateVehicleDnfProbability,
  updateVehicleCorneringSkill,
  updateVehicleDifferentialPreload,
  updateVehicleEngineBraking,
  updateVehicleBrakeBalance
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

  // Advanced physics parameters
  const [agentDifferential, setAgentDifferential] = useState(50)
  const [agentEngineBraking, setAgentEngineBraking] = useState(0.5)
  const [agentBrakeBalance, setAgentBrakeBalance] = useState(0.54)

  // Per-agent customization
  const [perAgentCustomize, setPerAgentCustomize] = useState(false)
  const [perAgentConfigs, setPerAgentConfigs] = useState<Record<number, {
    vehicleType?: 'car' | 'bike';
    maxSpeed: number;
    acceleration: number;
    dnfProbability: number;
    corneringSkill: number;
    differentialPreload?: number;
    engineBraking?: number;
    brakeBalance?: number
  }>>({})
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null)

  // Load circuits from public folder
  useEffect(() => {
    const loadCircuits = async () => {
      try {
        const response = await fetch('/data/circuits/f1-2024-circuits.json')
        const data = await response.json()
        // Extract circuits from JSON
        if (data.circuits) {
          const loadedCircuits = data.circuits.map((circuit: any) => ({
            id: circuit.id,
            name: circuit.name,
            location: circuit.location,
            coordinates: circuit.coordinates
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
        vehicleType: cfg.vehicleType,
        maxSpeed: cfg.maxSpeed,
        acceleration: cfg.acceleration,
        dnfProbability: cfg.dnfProbability / 100,
        differentialPreload: cfg.differentialPreload,
        engineBraking: cfg.engineBraking,
        brakeBalance: cfg.brakeBalance
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
      agentConfig: {
        maxSpeed: customizeAgents ? agentMaxSpeed : undefined,
        acceleration: customizeAgents ? agentAcceleration : undefined,
        dnfProbability: agentDnfProbability / 100, // Always pass DNF probability
        differentialPreload: customizeAgents ? agentDifferential : undefined,
        engineBraking: customizeAgents ? agentEngineBraking : undefined,
        brakeBalance: customizeAgents ? agentBrakeBalance : undefined
      },
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
          <label className="text-sm font-medium text-muted-foreground">Circuit ({circuits.length} tracks)</label>
          <select
            value={circuit}
            onChange={(e) => setCircuit(e.target.value)}
            disabled={raceActive}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {circuits.length > 0 ? (
              circuits.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.location}
                </option>
              ))
            ) : (
              <option value="mc-1929">Loading circuits...</option>
            )}
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
            max="10"
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
          <div className="text-xs text-muted-foreground text-center">0.5x - 10x speed</div>
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
            className="w-4 h-4 rounded border-border cursor-pointer"
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
                  if (raceActive && updateGlobalDnfProbability) {
                    // Update all vehicles with new DNF probability
                    updateGlobalDnfProbability(newDnf / 100)
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

        {customizeAgents && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-input/50 p-4 rounded-md mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Differential Preload: {agentDifferential} Nm
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={agentDifferential}
                onChange={(e) => {
                  const newDiff = parseFloat(e.target.value)
                  setAgentDifferential(newDiff)
                  if (raceActive && updateVehicleDifferentialPreload) {
                    // Update all vehicles with new differential preload
                    for (let i = 0; i < numAgents; i++) {
                      updateVehicleDifferentialPreload(i, newDiff)
                    }
                  }
                }}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground text-center">0 - 100 Nm (optimal: 50)</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Engine Braking: {(agentEngineBraking * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={agentEngineBraking}
                onChange={(e) => {
                  const newEB = parseFloat(e.target.value)
                  setAgentEngineBraking(newEB)
                  if (raceActive && updateVehicleEngineBraking) {
                    // Update all vehicles with new engine braking
                    for (let i = 0; i < numAgents; i++) {
                      updateVehicleEngineBraking(i, newEB)
                    }
                  }
                }}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground text-center">0 - 100% (typical: 50%)</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Brake Balance: {(agentBrakeBalance * 100).toFixed(0)}% Front
              </label>
              <input
                type="range"
                min="0.4"
                max="0.7"
                step="0.01"
                value={agentBrakeBalance}
                onChange={(e) => {
                  const newBB = parseFloat(e.target.value)
                  setAgentBrakeBalance(newBB)
                  if (raceActive && updateVehicleBrakeBalance) {
                    // Update all vehicles with new brake balance
                    for (let i = 0; i < numAgents; i++) {
                      updateVehicleBrakeBalance(i, newBB)
                    }
                  }
                }}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-muted-foreground text-center">40 - 70% (optimal: 52-56%)</div>
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
            className="w-4 h-4 rounded border-border cursor-pointer"
          />
          <label htmlFor="customize-per-agent" className="text-sm font-medium text-muted-foreground cursor-pointer">
            Customize Each Agent Individually
          </label>
        </div>

        {perAgentCustomize && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                const newConfigs: Record<number, any> = {}
                for (let i = 0; i < numAgents; i++) {
                  newConfigs[i] = {
                    maxSpeed: perAgentConfigs[i]?.maxSpeed ?? 90,
                    acceleration: perAgentConfigs[i]?.acceleration ?? 12.5,
                    dnfProbability: perAgentConfigs[i]?.dnfProbability ?? 2,
                    corneringSkill: perAgentConfigs[i]?.corneringSkill ?? 1.2,
                    differentialPreload: perAgentConfigs[i]?.differentialPreload ?? 50,
                    engineBraking: perAgentConfigs[i]?.engineBraking ?? 0.5,
                    brakeBalance: perAgentConfigs[i]?.brakeBalance ?? 0.54,
                    vehicleType: 'car'
                  }
                }
                setPerAgentConfigs(newConfigs)
              }}
              className="flex-1 px-3 py-2 bg-primary/20 text-primary border border-primary rounded-md text-sm font-medium hover:bg-primary/30 transition-colors"
            >
              🏎️ All Cars
            </button>
            <button
              onClick={() => {
                const newConfigs: Record<number, any> = {}
                for (let i = 0; i < numAgents; i++) {
                  newConfigs[i] = {
                    maxSpeed: perAgentConfigs[i]?.maxSpeed ?? 90,
                    acceleration: perAgentConfigs[i]?.acceleration ?? 12.5,
                    dnfProbability: perAgentConfigs[i]?.dnfProbability ?? 2,
                    corneringSkill: perAgentConfigs[i]?.corneringSkill ?? 1.2,
                    differentialPreload: perAgentConfigs[i]?.differentialPreload ?? 50,
                    engineBraking: perAgentConfigs[i]?.engineBraking ?? 0.5,
                    brakeBalance: perAgentConfigs[i]?.brakeBalance ?? 0.54,
                    vehicleType: 'bike'
                  }
                }
                setPerAgentConfigs(newConfigs)
              }}
              className="flex-1 px-3 py-2 bg-primary/20 text-primary border border-primary rounded-md text-sm font-medium hover:bg-primary/30 transition-colors"
            >
              🏍️ All Bikes
            </button>
            <button
              onClick={() => {
                const newConfigs: Record<number, any> = {}
                for (let i = 0; i < numAgents; i++) {
                  newConfigs[i] = {
                    maxSpeed: perAgentConfigs[i]?.maxSpeed ?? 90,
                    acceleration: perAgentConfigs[i]?.acceleration ?? 12.5,
                    dnfProbability: perAgentConfigs[i]?.dnfProbability ?? 2,
                    corneringSkill: perAgentConfigs[i]?.corneringSkill ?? 1.2,
                    differentialPreload: perAgentConfigs[i]?.differentialPreload ?? 50,
                    engineBraking: perAgentConfigs[i]?.engineBraking ?? 0.5,
                    brakeBalance: perAgentConfigs[i]?.brakeBalance ?? 0.54,
                    vehicleType: i % 2 === 0 ? 'car' : 'bike'
                  }
                }
                setPerAgentConfigs(newConfigs)
              }}
              className="flex-1 px-3 py-2 bg-accent/20 text-accent border border-accent rounded-md text-sm font-medium hover:bg-accent/30 transition-colors"
            >
              🔀 Mixed
            </button>
          </div>
        )}

        {perAgentCustomize && (
          <div className="space-y-2 bg-input/50 p-4 rounded-md max-h-96 overflow-y-auto">
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
                  <div className="space-y-3 mt-3 pt-3 border-t border-border">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Vehicle Type
                      </label>
                      <select
                        value={perAgentConfigs[i]?.vehicleType ?? 'car'}
                        onChange={(e) => {
                          const newType = e.target.value as 'car' | 'bike'
                          setPerAgentConfigs({
                            ...perAgentConfigs,
                            [i]: { ...perAgentConfigs[i], vehicleType: newType }
                          })
                        }}
                        className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground cursor-pointer"
                      >
                        <option value="car">🏎️ Car</option>
                        <option value="bike">🏍️ Bike</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
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

                    <div className="text-xs text-muted-foreground font-semibold pt-3 border-t border-border">Advanced Physics</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Diff: {(perAgentConfigs[i]?.differentialPreload ?? 50).toFixed(0)} Nm
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={perAgentConfigs[i]?.differentialPreload ?? 50}
                          onChange={(e) => {
                            const newDiff = parseFloat(e.target.value)
                            setPerAgentConfigs({
                              ...perAgentConfigs,
                              [i]: { ...perAgentConfigs[i], differentialPreload: newDiff }
                            })
                            if (raceActive && updateVehicleDifferentialPreload) {
                              updateVehicleDifferentialPreload(i, newDiff)
                            }
                          }}
                          className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          EB: {((perAgentConfigs[i]?.engineBraking ?? 0.5) * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={perAgentConfigs[i]?.engineBraking ?? 0.5}
                          onChange={(e) => {
                            const newEB = parseFloat(e.target.value)
                            setPerAgentConfigs({
                              ...perAgentConfigs,
                              [i]: { ...perAgentConfigs[i], engineBraking: newEB }
                            })
                            if (raceActive && updateVehicleEngineBraking) {
                              updateVehicleEngineBraking(i, newEB)
                            }
                          }}
                          className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          BB: {((perAgentConfigs[i]?.brakeBalance ?? 0.54) * 100).toFixed(0)}%F
                        </label>
                        <input
                          type="range"
                          min="0.4"
                          max="0.7"
                          step="0.01"
                          value={perAgentConfigs[i]?.brakeBalance ?? 0.54}
                          onChange={(e) => {
                            const newBB = parseFloat(e.target.value)
                            setPerAgentConfigs({
                              ...perAgentConfigs,
                              [i]: { ...perAgentConfigs[i], brakeBalance: newBB }
                            })
                            if (raceActive && updateVehicleBrakeBalance) {
                              updateVehicleBrakeBalance(i, newBB)
                            }
                          }}
                          className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
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
