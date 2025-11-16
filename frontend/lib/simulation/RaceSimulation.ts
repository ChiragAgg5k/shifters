/**
 * F1 Race Simulation Engine
 * Port of Python simulator.py - coordinates all race logic
 */

import { RacingVehicle, VehicleState } from '../physics/RacingVehicle'
import { Track, TrackInfo } from '../track/Track'

export interface SimulationConfig {
  track: Track
  timeStep?: number
  weather?: string
  temperature?: number
}

export interface SimulationState {
  step: number
  simulationTime: number
  running: boolean
  agents: VehicleState[]
  environment: {
    track: TrackInfo
    weather: string
    temperature: number
    trackWaterLevel?: number
  }
  currentLap: number
  safetyCar?: {
    active: boolean
    duration: number
    position: number
  }
  dnfs?: string[]
  raceReport?: any
}

export class RaceSimulation {
  track: Track
  timeStep: number
  weather: string
  temperature: number

  vehicles: RacingVehicle[] = []
  running: boolean = false
  simulationTime: number = 0
  step: number = 0
  currentLap: number = 0

  // Safety car
  safetyCarActive: boolean = false
  safetyCarDuration: number = 0
  safetyCarLapsRemaining: number = 0
  safetyCarPosition: number = 0 // Position on track

  // DNFs
  dnfVehicles: Set<string> = new Set()

  // Race report data
  raceReportData: any = null

  // Weather dynamics
  rainProbability: number = 0.0
  lastWeatherCheckLap: number = -1
  trackWaterLevel: number = 0.0 // 0-100%, affects tire performance
  waterAccumulationRate: number = 2.0 // % per simulation step in rain
  waterDryingRate: number = 0.5 // % per simulation step in dry

  constructor(config: SimulationConfig) {
    this.track = config.track
    this.timeStep = config.timeStep || 0.1
    this.weather = config.weather || 'clear'
    this.temperature = config.temperature || 35
  }

  /**
   * Add a vehicle to the simulation
   */
  addVehicle(vehicle: RacingVehicle): void {
    this.vehicles.push(vehicle)
  }

  /**
   * Start the race
   */
  start(): void {
    this.running = true
    this.simulationTime = 0
    this.step = 0
    this.currentLap = 0

    console.log(`🏁 Race started with ${this.vehicles.length} vehicles on ${this.track.name}`)
    console.log(`📏 Track length: ${this.track.length.toFixed(0)}m, Laps: ${this.track.numLaps}`)
    console.log(`🌡️ Track Temperature: ${this.temperature}°C`)
    console.log(`🌧️ Weather: ${this.weather}`)
    console.log(`⏱️ Time step: ${this.timeStep}s (${(1 / this.timeStep).toFixed(0)} FPS)`)
  }

  /**
   * Stop the race
   */
  stop(): void {
    this.running = false
    console.log(`🏁 Race stopped at ${this.simulationTime.toFixed(2)}s`)
  }

  /**
   * Advance simulation by one time step
   */
  stepSimulation(): void {
    if (!this.running) return

    this.step++
    this.simulationTime += this.timeStep

    // Update current lap (max lap of unfinished vehicles)
    const unfinishedVehicles = this.vehicles.filter(v => !v.finished && !this.dnfVehicles.has(v.id))
    if (unfinishedVehicles.length > 0) {
      this.currentLap = Math.max(...unfinishedVehicles.map(v => v.lap))
    }

    // Update safety car
    if (this.safetyCarActive) {
      this.safetyCarLapsRemaining -= this.timeStep / 60 // Rough lap time estimate
      
      // Safety car moves at constant speed (40 m/s)
      const safetyCarSpeed = 40
      this.safetyCarPosition += safetyCarSpeed * this.timeStep
      if (this.safetyCarPosition >= this.track.length) {
        this.safetyCarPosition = this.safetyCarPosition % this.track.length
      }
      
      if (this.safetyCarLapsRemaining <= 0) {
        this.safetyCarActive = false
        console.log('🟢 Safety car returning to pits')
      }
    }

    // Update each vehicle
    for (const vehicle of this.vehicles) {
      if (vehicle.finished || this.dnfVehicles.has(vehicle.id)) continue

      // Update track water level based on weather
      if (this.weather === 'rain') {
        // Water accumulates during rain
        this.trackWaterLevel = Math.min(100, this.trackWaterLevel + this.waterAccumulationRate * this.timeStep)
      } else {
        // Track dries when not raining
        this.trackWaterLevel = Math.max(0, this.trackWaterLevel - this.waterDryingRate * this.timeStep)
      }

      // Get track curvature at current position
      const curvature = this.track.getCurvature(vehicle.position)

      // Calculate target speed BEFORE moving
      vehicle.calculateTargetSpeed(curvature, this.weather, this.temperature, this.trackWaterLevel)

      // Safety car limits speed
      if (this.safetyCarActive) {
        vehicle.targetSpeed = Math.min(vehicle.targetSpeed, 40) // 40 m/s under safety car
        
        // Bunch up cars behind safety car
        // Calculate gap to car ahead (considering SC position)
        const sortedVehicles = [...this.vehicles]
          .filter(v => !v.finished && !this.dnfVehicles.has(v.id))
          .sort((a, b) => {
            const progressA = a.lap * this.track.length + a.position
            const progressB = b.lap * this.track.length + b.position
            return progressB - progressA
          })
        
        const vehicleIndex = sortedVehicles.findIndex(v => v.id === vehicle.id)
        if (vehicleIndex > 0) {
          const carAhead = sortedVehicles[vehicleIndex - 1]
          const gapToAhead = (carAhead.position - vehicle.position + this.track.length) % this.track.length
          
          // Maintain 30-50m gap under safety car
          const targetGap = 40
          if (gapToAhead < targetGap - 10) {
            // Too close - slow down more
            vehicle.targetSpeed = Math.min(vehicle.targetSpeed, 35)
          } else if (gapToAhead > targetGap + 20) {
            // Too far - catch up slightly
            vehicle.targetSpeed = Math.min(45, vehicle.targetSpeed)
          }
        }
      }

      // Check slipstream
      vehicle.checkSlipstream(this.vehicles, this.track.length)

      // DRS management (only on straights, not under safety car)
      if (curvature === 0 && !this.safetyCarActive) {
        vehicle.activateDrs()
      } else {
        vehicle.deactivateDrs()
      }

      // Move vehicle
      vehicle.move(this.timeStep, this.track.length)

      // Apply weather-based tire cooling after movement
      const ambientTemp = this.temperature
      if (vehicle.tireTemperature > ambientTemp) {
        let coolingRate = (vehicle.tireTemperature - ambientTemp) * 0.01 * this.timeStep
        if (this.weather === 'rain') {
          coolingRate *= 2.0 // Rain cools tires faster
        }
        vehicle.tireTemperature = Math.max(ambientTemp, vehicle.tireTemperature - coolingRate)
      }

      // Check lap completion
      if (vehicle.justCrossedLine) {
        const lapTime = this.simulationTime - vehicle.lapTimes.reduce((a, b) => a + b, 0)
        
        // Scale lap time to match realistic F1 lap times
        // Typical F1: 70-90s for 5-6km track, simulation produces ~40-60s
        // Scale factor: 1.4x to bring simulation times closer to reality
        const scaledLapTime = lapTime * 1.4

        // Calculate gaps for telemetry
        const leader = this.vehicles.find(v => v.currentPosition === 1)
        const gapToLeader = leader ? this.simulationTime - (leader.totalTime || 0) : 0

        vehicle.completeLap(scaledLapTime, gapToLeader, vehicle.gapToAhead)
        
        // Check if pit stop is needed (after crossing line)
        if (vehicle.shouldPitStop(vehicle.lap, this.track.numLaps, this.weather, this.trackWaterLevel)) {
          const nextCompound = vehicle.getNextTireCompound(this.weather, this.trackWaterLevel)
          const pitDuration = vehicle.pitStop(nextCompound)
          vehicle.lapPitStop = true
          vehicle.lapPitDuration = pitDuration
        }

        // Check if finished race (after completing the lap)
        if (vehicle.lap >= this.track.numLaps) {
          vehicle.finished = true
          console.log(`🏁 ${vehicle.name} finished in position ${this.getFinishedCount()}`)
        }
      }

      // DNF check (once per lap)
      if (vehicle.lap > vehicle.lastDnfCheckLap && vehicle.lap > 0) {
        vehicle.lastDnfCheckLap = vehicle.lap

        // DNF probability is now per-lap chance directly (not divided by num laps)
        const dnfChance = vehicle.dnfProbability
        if (Math.random() < dnfChance) {
          this.dnfVehicles.add(vehicle.id)
          console.log(`❌ DNF: ${vehicle.name} on lap ${vehicle.lap} (DNF probability: ${(dnfChance * 100).toFixed(1)}%)`)

          // 30% chance of safety car
          if (Math.random() < 0.3 && !this.safetyCarActive) {
            this.deploySafetyCar()
          }
        }
      }
    }

    // Update positions
    this.updatePositions()

    // Dynamic weather check (every lap for lead vehicle)
    if (this.currentLap > this.lastWeatherCheckLap && this.currentLap > 0) {
      this.lastWeatherCheckLap = this.currentLap
      
      // Check if weather should change based on rain probability
      if (Math.random() < this.rainProbability) {
        // Transition to rain
        if (this.weather === 'clear') {
          this.weather = 'rain'
          console.log(`🌧️ Weather change: Rain started on lap ${this.currentLap}`)
        }
      } else {
        // Transition to clear
        if (this.weather === 'rain') {
          this.weather = 'clear'
          console.log(`☀️ Weather change: Rain stopped on lap ${this.currentLap}`)
        }
      }
    }

    // Check if race is complete (all vehicles finished or DNF'd)
    const activeVehicles = this.vehicles.filter(v => !v.finished && !this.dnfVehicles.has(v.id))
    if (activeVehicles.length === 0 && this.vehicles.length > 0) {
      this.running = false
      console.log(`🏆 Race finished! Total time: ${this.simulationTime.toFixed(2)}s`)
      this.generateRaceReport()
    }

    // Debug: log first vehicle status every 10 steps
    if (this.step % 100 === 0 && this.step > 0) {
      const v = this.vehicles[0]
      console.log(`Step ${this.step}: ${v.name} - Lap ${v.lap}/${this.track.numLaps}, Pos ${v.position.toFixed(0)}m, Speed ${v.speed.toFixed(1)} m/s`)
    }
  }

  /**
   * Deploy safety car
   */
  deploySafetyCar(): void {
    this.safetyCarActive = true
    this.safetyCarLapsRemaining = 3 // 3 laps under safety car
    this.safetyCarDuration = 3
    
    // Position safety car ahead of leader
    const leader = this.vehicles
      .filter(v => !v.finished && !this.dnfVehicles.has(v.id))
      .sort((a, b) => {
        const progressA = a.lap * this.track.length + a.position
        const progressB = b.lap * this.track.length + b.position
        return progressB - progressA
      })[0]
    
    if (leader) {
      // Start SC 100m ahead of leader
      this.safetyCarPosition = (leader.position + 100) % this.track.length
    } else {
      this.safetyCarPosition = 0
    }
    
    console.log('🟡 Safety car deployed!')
  }

  /**
   * Update vehicle positions based on race progress
   */
  updatePositions(): void {
    // Sort vehicles by progress (lap * track length + position)
    const sortedVehicles = [...this.vehicles]
      .filter(v => !this.dnfVehicles.has(v.id))
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1
        const progressA = a.lap * this.track.length + a.position
        const progressB = b.lap * this.track.length + b.position
        return progressB - progressA
      })

    // Assign positions and calculate gaps
    sortedVehicles.forEach((vehicle, index) => {
      const oldPosition = vehicle.currentPosition
      vehicle.currentPosition = index + 1

      // Calculate gap to car ahead (in seconds)
      if (index > 0) {
        const carAhead = sortedVehicles[index - 1]
        const distanceGap = (carAhead.lap * this.track.length + carAhead.position) -
          (vehicle.lap * this.track.length + vehicle.position)

        // Calculate average speed for time estimation (avoid division by zero)
        const avgSpeed = (vehicle.speed + carAhead.speed) / 2
        vehicle.gapToAhead = avgSpeed > 0.1 ? distanceGap / avgSpeed : 0
      } else {
        // Leader has no gap
        vehicle.gapToAhead = 0
      }

      // Track overtakes
      if (oldPosition > vehicle.currentPosition) {
        vehicle.overtakes++
        vehicle.positionsGained++
        vehicle.lapOvertakes++ // Track for telemetry
      } else if (oldPosition < vehicle.currentPosition) {
        vehicle.overtakenThisLap = true
      }
    })
  }

  /**
   * Get count of finished vehicles
   */
  getFinishedCount(): number {
    return this.vehicles.filter(v => v.finished).length
  }

  /**
   * Generate comprehensive race report with telemetry analysis
   */
  generateRaceReport(): void {
    console.log('\n' + '='.repeat(80))
    console.log('📊 RACE REPORT - ' + this.track.name.toUpperCase())
    console.log('='.repeat(80))

    const finishedVehicles = this.vehicles
      .filter(v => v.finished)
      .sort((a, b) => (a.totalTime || 0) - (b.totalTime || 0))

    // Final Classification
    console.log('\n🏁 FINAL CLASSIFICATION:')
    finishedVehicles.forEach((v, i) => {
      const totalTime = (v.totalTime || 0).toFixed(2)
      const gap = i === 0 ? 'Winner' : `+${((v.totalTime || 0) - (finishedVehicles[0].totalTime || 0)).toFixed(2)}s`
      console.log(`${(i + 1).toString().padStart(2)}. ${v.name.padEnd(15)} ${totalTime}s (${gap}) - ${v.pitStops} stops`)
    })

    // Fastest Lap
    console.log('\n⚡ FASTEST LAPS:')
    const fastestLaps = this.vehicles
      .map(v => ({
        name: v.name,
        fastestLap: Math.min(...v.lapTimes.filter(t => t > 0)),
        lapNumber: v.lapTimes.indexOf(Math.min(...v.lapTimes.filter(t => t > 0))) + 1
      }))
      .sort((a, b) => a.fastestLap - b.fastestLap)
      .slice(0, 3)

    fastestLaps.forEach((fl, i) => {
      console.log(`${i + 1}. ${fl.name.padEnd(15)} ${fl.fastestLap.toFixed(2)}s (Lap ${fl.lapNumber})`)
    })

    // Store report data for UI
    this.raceReportData = {
      classification: finishedVehicles.map((v, i) => ({
        position: i + 1,
        name: v.name,
        totalTime: v.totalTime || 0,
        gap: i === 0 ? 0 : (v.totalTime || 0) - (finishedVehicles[0].totalTime || 0),
        pitStops: v.pitStops,
        telemetry: v.lapTelemetry
      })),
      fastestLaps: fastestLaps,
      trackName: this.track.name,
      totalLaps: this.track.numLaps,
      raceTime: this.simulationTime
    }

    console.log('\n' + '='.repeat(80) + '\n')
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    return {
      step: this.step,
      simulationTime: this.simulationTime,
      running: this.running,
      agents: this.vehicles.map(v => v.getState()),
      environment: {
        track: this.track.getInfo(),
        weather: this.weather,
        temperature: this.temperature,
        trackWaterLevel: Math.round(this.trackWaterLevel)
      },
      currentLap: this.currentLap,
      safetyCar: {
        active: this.safetyCarActive,
        duration: this.safetyCarLapsRemaining,
        position: this.safetyCarPosition
      },
      dnfs: Array.from(this.dnfVehicles),
      raceReport: this.raceReportData
    }
  }  /**
   * Realtime update methods for simulation parameters
   */
  updateWeather(newWeather: string): void {
    this.weather = newWeather
    console.log(`🌦️ Weather updated to: ${newWeather}`)
  }

  updateRainProbability(probability: number): void {
    this.rainProbability = probability
    console.log(`🌧️ Rain probability updated to: ${(probability * 100).toFixed(0)}%`)
  }

  updateTemperature(newTemperature: number): void {
    this.temperature = newTemperature
    console.log(`🌡️ Temperature updated to: ${newTemperature}°C`)
  }

  /**
   * Realtime update methods for individual vehicle parameters
   */
  updateVehicleMaxSpeed(vehicleIndex: number, newMaxSpeed: number): void {
    if (vehicleIndex >= 0 && vehicleIndex < this.vehicles.length) {
      this.vehicles[vehicleIndex].updateMaxSpeed(newMaxSpeed)
    }
  }

  updateVehicleAcceleration(vehicleIndex: number, newAcceleration: number): void {
    if (vehicleIndex >= 0 && vehicleIndex < this.vehicles.length) {
      this.vehicles[vehicleIndex].updateAcceleration(newAcceleration)
    }
  }

  updateVehicleBrakingRate(vehicleIndex: number, newBrakingRate: number): void {
    if (vehicleIndex >= 0 && vehicleIndex < this.vehicles.length) {
      this.vehicles[vehicleIndex].updateBrakingRate(newBrakingRate)
    }
  }

  updateVehicleCorneringSkill(vehicleIndex: number, newCorneringSkill: number): void {
    if (vehicleIndex >= 0 && vehicleIndex < this.vehicles.length) {
      this.vehicles[vehicleIndex].updateCorneringSkill(newCorneringSkill)
    }
  }

  updateVehicleDnfProbability(vehicleIndex: number, newDnfProbability: number): void {
    if (vehicleIndex >= 0 && vehicleIndex < this.vehicles.length) {
      this.vehicles[vehicleIndex].updateDnfProbability(newDnfProbability)
    }
  }

  updateVehicleDifferentialPreload(vehicleIndex: number, newDifferentialPreload: number): void {
    if (vehicleIndex >= 0 && vehicleIndex < this.vehicles.length) {
      this.vehicles[vehicleIndex].updateDifferentialPreload(newDifferentialPreload)
    }
  }

  updateVehicleEngineBraking(vehicleIndex: number, newEngineBraking: number): void {
    if (vehicleIndex >= 0 && vehicleIndex < this.vehicles.length) {
      this.vehicles[vehicleIndex].updateEngineBraking(newEngineBraking)
    }
  }

  updateVehicleBrakeBalance(vehicleIndex: number, newBrakeBalance: number): void {
    if (vehicleIndex >= 0 && vehicleIndex < this.vehicles.length) {
      this.vehicles[vehicleIndex].updateBrakeBalance(newBrakeBalance)
    }
  }
}
