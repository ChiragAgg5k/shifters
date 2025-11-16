/**
 * F1 Racing Vehicle Physics Engine
 * Port of Python base_agent.py with full F1-metrics inspired physics
 */

export interface LapTelemetry {
  lapNumber: number
  lapTime: number
  tireWearStart: number
  tireWearEnd: number
  tireCompound: string
  avgTireTemp: number
  maxTireTemp: number
  minTireTemp: number
  energyStart: number
  energyEnd: number
  energyUsed: number
  damageStart: number
  damageEnd: number
  avgSpeed: number
  maxSpeed: number
  topSpeed: number
  overtakesMade: number
  drsUsageTime: number
  slipstreamTime: number
  position: number
  gapToLeader: number
  gapToAhead: number
  pitStopThisLap: boolean
  pitStopDuration: number
}

export interface VehicleConfig {
  id: string
  name: string
  vehicleType?: 'car' | 'bike'
  maxSpeed: number
  acceleration: number
  brakingRate?: number
  corneringSkill?: number
  mass?: number
  dragCoefficient?: number
  frontalArea?: number
  downforceCoefficient?: number
  qualifyingPosition?: number
  lapTimeStd?: number
  dnfProbability?: number
  // Advanced physics parameters (RL training)
  differentialPreload?: number  // 0-100 Nm, optimal ~50
  engineBraking?: number         // 0.0-1.0, where 0=min harvesting, 1=max braking
  brakeBalance?: number          // 0.0-1.0, front bias (optimal ~0.52-0.56)
  // Tire compound
  tireCompound?: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet'
}

export interface VehicleState {
  id: string
  name: string
  vehicleType: 'car' | 'bike'
  position: number
  speed: number
  lap: number
  finished: boolean
  totalTime: number
  energy: number
  tireWear: number
  tireTemperature: number
  tireCompound: string
  drsActive: boolean
  inSlipstream: boolean
  damageLevel: number
  pitStops: number
  currentPosition: number
  justCrossedLine: boolean
  gapToAhead: number // Time gap to car ahead in seconds
  inPit: boolean // Currently in pit lane
  nextPitLap: number // Planned lap for next pit stop
  // Battery telemetry
  batteryPower?: number // Current power draw (kW)
  batteryChargingPower?: number // Energy recovery (kW)
  batteryTemperature?: number // Battery temp (°C)
  ersHarvestedEnergy?: number // Total harvested (kWh)
  ersDeployedEnergy?: number // Total deployed (kWh)
}

export class RacingVehicle {
  // Identity
  id: string
  name: string
  vehicleType: 'car' | 'bike' = 'car'

  // Position and motion
  position: number = 0
  speed: number = 0
  targetSpeed: number = 0
  distanceTraveled: number = 0

  // Performance characteristics
  maxSpeed: number
  acceleration: number
  brakingRate: number
  corneringSkill: number

  // F1-specific physics
  mass: number
  dragCoefficient: number
  frontalArea: number
  downforceCoefficient: number

  // Shorthand aliases for physics calculations
  Cd: number
  A: number
  Cl: number
  g: number = 9.81
  rho: number = 1.225
  mu: number = 1.8

  // Vehicle geometry (for load transfer)
  wheelbase: number = 3.6
  cgHeight: number = 0.35
  trackWidth: number = 2.0
  frontWeightDist: number = 0.46

  // Advanced physics parameters
  differentialPreload: number
  engineBraking: number
  brakeBalance: number

  // Physics state variables
  frontLoad: number = 0
  rearLoad: number = 0
  lateralLoad: number = 0
  tractionFactor: number = 1.0
  downforceLevel: number = 0
  brakeEfficiency: number = 1.0

  // Race state
  lap: number = 0
  finished: boolean = false
  totalTime: number = 0
  lapTimes: number[] = []
  lapTelemetry: LapTelemetry[] = [] // Detailed telemetry per lap

  // Current lap tracking for telemetry
  lapStartTime: number = 0
  lapEnergyStart: number = 100
  lapTireWearStart: number = 0
  lapDamageStart: number = 0
  lapSpeedSum: number = 0
  lapSpeedSamples: number = 0
  lapMaxSpeed: number = 0
  lapTireTempSum: number = 0
  lapTireTempSamples: number = 0
  lapTireTempMax: number = 0
  lapTireTempMin: number = 999
  lapOvertakes: number = 0
  lapDrsTime: number = 0
  lapSlipstreamTime: number = 0
  lapPitStop: boolean = false
  lapPitDuration: number = 0

  // Energy and tire management
  energy: number = 100 // Battery state of charge (0-100%)
  maxBatteryCapacity: number = 52.0 // kWh (typical F1 battery)
  batteryStateOfCharge: number = 100 // Percentage
  batteryTemperature: number = 25 // °C
  batteryPower: number = 0 // Current power draw (kW)
  batteryChargingPower: number = 0 // Energy recovery (kW)
  
  // Energy recovery system (ERS)
  ersHarvestedEnergy: number = 0 // Total harvested this lap (kJ)
  ersDeployedEnergy: number = 0 // Total deployed this lap (kJ)
  ersEfficiency: number = 0.85 // 85% efficiency on recovery
  
  tireWear: number = 0
  tireTemperature: number = 60 // Start with cool tires (realistic warm-up)
  tireCompound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet' = 'medium'
  tireWearRate: number = 1.0 // Multiplier based on compound
  tireGripLevel: number = 1.0 // Grip multiplier based on compound

  // Aerodynamics
  drsActive: boolean = false
  inSlipstream: boolean = false

  // Damage
  damageLevel: number = 0

  // Strategy
  pitStops: number = 0

  // Driver characteristics
  qualifyingPosition: number
  lapTimeStd: number
  dnfProbability: number
  gridPenalty: number
  startBonus: number = 0

  // Race position
  currentPosition: number
  overtakenThisLap: boolean = false
  overtakes: number = 0
  positionsGained: number = 0
  gapToAhead: number = 0 // Time gap to car ahead in seconds

  // Pit stop strategy
  inPit: boolean = false
  pitTimeRemaining: number = 0 // Simulation time remaining in pit (seconds)
  nextPitLap: number = -1 // -1 means not yet planned
  pitStopStrategy: ('soft' | 'medium' | 'hard')[] = [] // Tire compound strategy

  // Track state
  currentCurvature: number = 0

  // DNF tracking
  lastDnfCheckLap: number = -1
  justCrossedLine: boolean = false

  constructor(config: VehicleConfig) {
    this.id = config.id
    this.name = config.name
    this.vehicleType = config.vehicleType || 'car'
    this.maxSpeed = config.maxSpeed
    this.acceleration = config.acceleration
    this.brakingRate = config.brakingRate || 15
    this.corneringSkill = config.corneringSkill || 1.2

    // F1 physics parameters
    this.mass = config.mass || 798 // kg (F1 minimum weight)
    this.dragCoefficient = config.dragCoefficient || 0.7
    this.frontalArea = config.frontalArea || 1.5 // m²
    this.downforceCoefficient = config.downforceCoefficient || 3.0

    // Aliases for calculations
    this.Cd = this.dragCoefficient
    this.A = this.frontalArea
    this.Cl = this.downforceCoefficient

    // Advanced physics parameters with defaults
    this.differentialPreload = config.differentialPreload ?? 50.0  // Nm
    this.engineBraking = config.engineBraking ?? 0.5               // 50% default
    this.brakeBalance = config.brakeBalance ?? 0.54                // 54% front

    // Driver parameters
    this.qualifyingPosition = config.qualifyingPosition || 1
    this.lapTimeStd = config.lapTimeStd || 0.15
    this.dnfProbability = config.dnfProbability ?? 0.02
    this.gridPenalty = (this.qualifyingPosition - 1) * 0.25

    this.currentPosition = this.qualifyingPosition

    // Set tire compound and initialize characteristics
    this.tireCompound = config.tireCompound || 'medium'
    this.setTireCompoundCharacteristics(this.tireCompound)

    // Initialize pit stop strategy for races (will be updated by simulation)
    this.planPitStopStrategy()
  }

  /**
   * Calculate target speed based on track curvature, weather, and vehicle state
   * Now includes track water level for realistic wet tire performance
   */
  calculateTargetSpeed(curvature: number, weather: string, _trackTemp: number, trackWaterLevel: number = 0): void {
    this.currentCurvature = curvature

    // Calculate downforce at current speed
    this.downforceLevel = 0.5 * this.rho * this.Cl * this.A * (this.speed ** 2)

    // Total normal force = weight + downforce
    const normalForce = (this.mass * this.g) + this.downforceLevel

    // Load-sensitive tire model
    // Nominal load per tire (static, no downforce)
    const nominalLoadPerTire = (this.mass * this.g) / 4 // 1956.6 N for 798kg car

    // Current load per tire (with downforce)
    const currentLoadPerTire = normalForce / 4

    // Tire load sensitivity: -3% grip per 1000N over nominal
    const excessLoad = (currentLoadPerTire - nominalLoadPerTire) / 1000
    const tireLoadFactor = 1.0 - (excessLoad * 0.03)

    // Effective friction coefficient
    const effectiveFriction = this.mu * tireLoadFactor

    // Base speed calculation
    if (curvature === 0) {
      // Straight: use max speed (traction factor affects acceleration, not top speed)
      this.targetSpeed = this.maxSpeed
    } else {
      // Corner: physics-based max speed
      // v_max = sqrt((μ * N * r) / m)
      const radius = 1.0 / curvature

      // Calculate maximum cornering speed from force balance
      const maxCorneringSpeed = Math.sqrt(
        (effectiveFriction * normalForce * radius) / this.mass
      )

      // Apply cornering skill (driver skill affects how close to limit they get)
      // 1.0 = perfect, >1.0 = slightly over limit (risky), <1.0 = conservative
      this.targetSpeed = maxCorneringSpeed * Math.min(this.corneringSkill, 1.15)
    }

    // Weather effects on grip
    let gripMultiplier = 1.0
    
    // Calculate grip based on track water level and tire compound
    if (trackWaterLevel > 0) {
      // Track has water - tire performance depends on compound
      if (this.tireCompound === 'wet') {
        // Full wets: Best in heavy water (>70%), decent in light water
        if (trackWaterLevel > 70) {
          gripMultiplier = 1.0 // Optimal
        } else if (trackWaterLevel > 30) {
          gripMultiplier = 0.85 // Still good
        } else {
          gripMultiplier = 0.65 // Too much grip = overheating on drying track
        }
      } else if (this.tireCompound === 'intermediate') {
        // Inters: Best in light-medium water (30-70%)
        if (trackWaterLevel > 70) {
          gripMultiplier = 0.75 // Not enough tread for heavy water
        } else if (trackWaterLevel > 20) {
          gripMultiplier = 0.95 // Optimal range
        } else {
          gripMultiplier = 0.80 // OK on drying track
        }
      } else {
        // Slicks (soft/medium/hard): Lose performance with water
        const waterPenalty = trackWaterLevel / 100
        gripMultiplier = 1.0 - (waterPenalty * 0.6) // Up to 60% grip loss in standing water
      }
    } else {
      // Dry track
      if (this.tireCompound === 'wet') {
        gripMultiplier = 0.50 // Full wets terrible on dry
      } else if (this.tireCompound === 'intermediate') {
        gripMultiplier = 0.75 // Inters poor on dry
      } else {
        gripMultiplier = 1.0 // Slicks optimal on dry
      }
    }

    // Tire temperature effects (optimal: 80-100°C) - DISCRETE thresholds like Python
    if (this.tireTemperature < 60) {
      gripMultiplier *= 0.9 // Cold tires
    } else if (this.tireTemperature > 110) {
      gripMultiplier *= 0.85 // Overheated tires
    }

    // Damage reduces cornering ability
    const damageMultiplier = 1.0 - (this.damageLevel / 200)

    // Apply all multipliers
    this.targetSpeed *= gripMultiplier * damageMultiplier

    // Energy limit
    if (this.energy < 10) {
      this.targetSpeed *= 0.8 // Reduced power mode
    }

    // Hard cap: never exceed maxSpeed on straights (corners use physics-based limit)
    if (curvature === 0) {
      this.targetSpeed = Math.min(this.targetSpeed, this.maxSpeed)
    }
  }

  /**
   * Update vehicle physics for one time step
   * Enhanced with load transfer, differential, engine braking, and brake balance
   */
  move(timeStep: number, trackLength: number): void {
    // Handle pit stop timing (simulation-based, not real-time)
    // DO NOT collect telemetry during pit stops
    if (this.inPit) {
      this.pitTimeRemaining -= timeStep
      // Force exit pit after time expires (safety check to prevent stuck vehicles)
      // Maximum pit time is 5 seconds - if it exceeds that, force exit
      if (this.pitTimeRemaining <= 0 || this.pitTimeRemaining < -1) {
        this.inPit = false
        this.pitTimeRemaining = 0
        // Continue to normal physics after pit stop
      } else {
        // Still in pit, don't move or collect telemetry
        return
      }
    }

    // Driver consistency variation
    const lapTimeVariation = this.lapTimeStd * (Math.random() * 2 - 1)

    // Overtake penalty (0.4s for taking inferior line) - matches Python backend
    const overtakePenalty = this.overtakenThisLap ? 0.4 : 0
    this.overtakenThisLap = false

    // Aerodynamic drag: F_drag = 0.5 * ρ * Cd * A * v²
    let dragForce = 0.5 * this.rho * this.Cd * this.A * (this.speed ** 2)

    // DRS reduces drag by 25% on straights
    if (this.drsActive && this.currentCurvature === 0) {
      dragForce *= 0.75
    }

    // Slipstream reduces drag by 30%
    if (this.inSlipstream) {
      dragForce *= 0.70
    }

    // Downforce already calculated in calculateTargetSpeed
    // this.downforceLevel is up-to-date

    // Drag reduces acceleration
    const dragDeceleration = dragForce / this.mass

    // Calculate lateral and longitudinal acceleration for load transfer
    let lateralAccel = 0
    let longitudinalAccel = 0

    if (this.currentCurvature > 0) {
      // Lateral acceleration in corners: a = v² / r
      const radius = 1.0 / this.currentCurvature
      lateralAccel = (this.speed ** 2) / radius
    }

    // Apply acceleration/braking
    if (this.speed < this.targetSpeed) {
      // Accelerating
      longitudinalAccel = this.acceleration - dragDeceleration

      // Calculate load transfer
      this.calculateLoadTransfer(lateralAccel, longitudinalAccel)

      // Calculate differential effect (estimate wheel speeds)
      const outerWheelSpeed = this.speed * (1 + this.currentCurvature * 2)
      const innerWheelSpeed = this.speed * (1 - this.currentCurvature * 2)
      this.calculateDifferentialEffect(outerWheelSpeed, innerWheelSpeed)

      // Apply traction factor from differential
      const netAcceleration = longitudinalAccel * this.tractionFactor
      this.speed = Math.min(this.speed + netAcceleration * timeStep, this.targetSpeed)

    } else if (this.speed > this.targetSpeed) {
      // Braking
      longitudinalAccel = -this.brakingRate

      // Calculate load transfer (braking shifts weight forward)
      const wheelLoads = this.calculateLoadTransfer(lateralAccel, longitudinalAccel)

      // Calculate engine braking
      const engineBrakingDecel = this.calculateEngineBraking(longitudinalAccel)

      // Calculate brake distribution and check for lock-up
      const brakeResult = this.calculateBrakeDistribution(this.brakingRate, wheelLoads)

      // Total deceleration: drag + engine braking + actual brakes
      const totalDeceleration = dragDeceleration + Math.abs(engineBrakingDecel) + brakeResult.deceleration

      this.speed = Math.max(this.speed - totalDeceleration * timeStep, this.targetSpeed)

    } else {
      // Maintaining speed
      // Still calculate load transfer for corners
      this.calculateLoadTransfer(lateralAccel, 0)

      // Engine braking when coasting
      const engineBrakingDecel = this.calculateEngineBraking(0)
      const totalDecel = dragDeceleration + Math.abs(engineBrakingDecel)

      this.speed = Math.max(0, this.speed - totalDecel * timeStep)
    }

    // CRITICAL: Enforce absolute speed limit (applies to both straights AND corners)
    // maxSpeed is a hard limit set by the user/config and should never be exceeded
    this.speed = Math.min(this.speed, this.maxSpeed)

    // Calculate movement
    const baseMovement = this.speed * timeStep
    const variationDistance = -lapTimeVariation * (this.speed / 10.0)
    const penaltyDistance = -overtakePenalty * (this.speed / 10.0)

    let movement = baseMovement + variationDistance + penaltyDistance
    movement = Math.max(0, movement)

    this.position += movement
    this.distanceTraveled += movement

    // Collect telemetry samples during lap
    this.lapSpeedSum += this.speed
    this.lapSpeedSamples++
    this.lapMaxSpeed = Math.max(this.lapMaxSpeed, this.speed)

    this.lapTireTempSum += this.tireTemperature
    this.lapTireTempSamples++
    this.lapTireTempMax = Math.max(this.lapTireTempMax, this.tireTemperature)
    this.lapTireTempMin = Math.min(this.lapTireTempMin, this.tireTemperature)

    if (this.drsActive) this.lapDrsTime += timeStep
    if (this.inSlipstream) this.lapSlipstreamTime += timeStep

    // Normalize position for circuit tracks
    this.justCrossedLine = false
    if (this.position >= trackLength) {
      this.position = this.position % trackLength
      this.justCrossedLine = true
    }

    // ===== REALISTIC BATTERY & ENERGY MANAGEMENT =====
    // F1 2024: 52 kWh battery, ~1100 kW peak power, ~160 kW average consumption
    
    // 1. POWER DEMAND CALCULATION
    let powerDemand = 0 // kW
    
    // Base power: proportional to speed (aerodynamic losses)
    const speedRatio = this.speed / this.maxSpeed
    const dragPower = (0.5 * this.rho * this.Cd * this.A * Math.pow(this.speed, 3)) / 1000 // Convert to kW
    powerDemand += dragPower
    
    // Acceleration power: P = F * v
    if (this.speed < this.targetSpeed) {
      // Accelerating: need to overcome drag + provide acceleration
      const accelForce = this.mass * this.acceleration
      const accelPower = (accelForce * this.speed) / 1000 // kW
      powerDemand += accelPower * 0.8 // 80% efficiency in drivetrain
    }
    
    // Cornering power: lateral forces increase power demand
    if (this.currentCurvature > 0) {
      const corneringPower = Math.abs(this.currentCurvature * 100) * speedRatio * 50 // Up to 50 kW in hard corners
      powerDemand += corneringPower
    }
    
    // DRS deployment increases power demand
    if (this.drsActive) {
      powerDemand *= 1.05 // 5% more power to maintain speed with DRS
    }
    
    // 2. ENERGY RECOVERY (REGENERATIVE BRAKING & MGU-K)
    let recoveredPower = 0 // kW
    
    if (this.speed > this.targetSpeed) {
      // Braking: recover energy through regenerative braking
      const brakingForce = this.mass * this.brakingRate
      const brakingPower = (brakingForce * this.speed) / 1000 // kW
      
      // Recovery efficiency depends on brake balance and engine braking
      // More engine braking = more efficient recovery
      const recoveryEfficiency = this.ersEfficiency * (0.5 + this.engineBraking * 0.5) // 42.5%-85%
      recoveredPower = brakingPower * recoveryEfficiency
      
      // Cap recovery at 120 kW (MGU-K limit)
      recoveredPower = Math.min(recoveredPower, 120)
    } else if (this.speed > 0 && this.currentCurvature > 0.01) {
      // Cornering: recover some energy from lateral forces
      const corneringForce = this.mass * (this.speed ** 2) * this.currentCurvature
      const corneringRecovery = (corneringForce * this.speed) / 1000 * 0.1 // 10% of cornering force
      recoveredPower = Math.min(corneringRecovery, 30) // Cap at 30 kW
    }
    
    // 3. ENGINE BRAKING EFFECT ON POWER DEMAND
    // Higher engine braking = more deceleration without using brakes
    // This reduces brake wear but increases energy recovery
    if (this.speed > this.targetSpeed) {
      const engineBrakingForce = this.engineBraking * 2.0 // Up to 2.0 m/s² deceleration
      const engineBrakingPower = (engineBrakingForce * this.mass * this.speed) / 1000
      
      // Engine braking reduces actual brake power needed
      powerDemand -= engineBrakingPower * 0.5 // 50% of engine braking reduces power draw
      
      // But engine braking increases energy recovery
      recoveredPower += engineBrakingPower * 0.3 // 30% of engine braking power recovered
    }
    
    // 4. BATTERY STATE OF CHARGE MANAGEMENT
    // Net power: positive = discharge, negative = charge
    const netPower = powerDemand - recoveredPower // kW
    
    // Energy change in this timestep (kWh)
    const energyChange = (netPower * timeStep) / 3600 // Convert kW*s to kWh
    
    // Update battery capacity (kWh)
    const currentBatteryEnergy = (this.batteryStateOfCharge / 100) * this.maxBatteryCapacity
    const newBatteryEnergy = Math.max(0, Math.min(
      this.maxBatteryCapacity,
      currentBatteryEnergy - energyChange
    ))
    
    this.batteryStateOfCharge = (newBatteryEnergy / this.maxBatteryCapacity) * 100
    this.batteryPower = netPower
    this.batteryChargingPower = recoveredPower
    
    // Track ERS energy for telemetry
    this.ersHarvestedEnergy += recoveredPower * timeStep / 3600
    this.ersDeployedEnergy += Math.max(0, powerDemand) * timeStep / 3600
    
    // 5. BATTERY TEMPERATURE MANAGEMENT
    // Battery heats up with high power draw/recovery
    const powerIntensity = Math.abs(netPower) / 1000 // Normalized 0-1
    const batteryHeat = powerIntensity * 0.5 * timeStep // Up to 0.5°C/s at max power
    this.batteryTemperature = Math.min(65, this.batteryTemperature + batteryHeat)
    
    // Battery cools naturally
    const batteryTempDiff = this.batteryTemperature - 25
    const batteryCooling = batteryTempDiff * 0.02 * timeStep
    this.batteryTemperature = Math.max(25, this.batteryTemperature - batteryCooling)
    
    // 6. PERFORMANCE PENALTY FOR LOW BATTERY
    // Below 10% SoC: significant power reduction
    if (this.batteryStateOfCharge < 10) {
      this.targetSpeed *= 0.7 // 30% speed reduction
    } else if (this.batteryStateOfCharge < 20) {
      this.targetSpeed *= 0.85 // 15% speed reduction
    }
    
    // 7. SYNC LEGACY ENERGY VARIABLE (0-100 scale)
    this.energy = this.batteryStateOfCharge

    // Tire wear (cornering, braking, high speed, and dirty air)
    // Base wear rate: ~1% per lap on medium tires in normal conditions
    let totalWear = 0

    // Cornering wear (main source)
    if (this.currentCurvature > 0) {
      const corneringIntensity = (this.speed / this.maxSpeed) * Math.abs(this.currentCurvature * 100)
      let wearRate = corneringIntensity * 0.15 * this.tireWearRate * timeStep

      // Dirty air increases tire wear by 10% (F1-metrics inspired)
      if (this.inSlipstream) {
        wearRate *= 1.1
      }
      totalWear += wearRate
    }

    // Hard braking increases tire wear
    if (this.speed > this.targetSpeed) {
      const brakingFactor = Math.abs(this.speed - this.targetSpeed) / this.maxSpeed
      const brakeWear = brakingFactor * 0.08 * this.tireWearRate * timeStep
      totalWear += brakeWear
    }

    // Straight-line wear (minimal but constant)
    if (this.speed > 0) {
      const straightWear = (this.speed / this.maxSpeed) * 0.02 * this.tireWearRate * timeStep
      totalWear += straightWear
    }

    // Temperature-based wear (overheating degrades tires faster)
    if (this.tireTemperature > 100) {
      const tempWearMultiplier = 1.0 + ((this.tireTemperature - 100) / 100)
      totalWear *= tempWearMultiplier
    }

    this.tireWear = Math.min(100.0, this.tireWear + totalWear)

    // Advanced tire temperature modeling
    // Base heating depends on current tire temperature (harder to heat when already hot)
    const tempDiff = 110 - this.tireTemperature // Optimal operating temp ~90-100°C
    const tempFactor = Math.max(0.3, Math.min(1.0, tempDiff / 50)) // Diminishing returns

    // Heating from speed (energy dissipation through tire flex)
    let heatRate = 0
    if (this.speed > 0) {
      const speedRatio = this.speed / this.maxSpeed
      // Base heating: ~0.8°C/s at full speed when cold, reduces as temp increases
      heatRate = speedRatio * 0.8 * tempFactor * timeStep

      // Cornering generates significant heat through lateral forces
      if (this.currentCurvature > 0) {
        const corneringIntensity = Math.min(1.0, this.currentCurvature * 100)
        const lateralHeat = corneringIntensity * 1.2 * timeStep // Up to +1.2°C/s in hard corners
        heatRate += lateralHeat
      }

      // Braking generates heat through tire-ground friction
      if (this.speed > 10 && this.currentCurvature > 0.005) {
        const brakingHeat = 0.4 * timeStep // +0.4°C/s during braking
        heatRate += brakingHeat
      }

      // Aggressive driving (high cornering skill = more heat)
      const aggressionMultiplier = 0.8 + (this.corneringSkill * 0.4) // 0.8-1.2x
      heatRate *= aggressionMultiplier

      // Tire compound affects heat generation
      const compoundHeatMultiplier = {
        'soft': 1.2,      // Softs run hotter
        'medium': 1.0,    // Baseline
        'hard': 0.85,     // Hards stay cooler
        'intermediate': 0.9,
        'wet': 0.8        // Wets need less heat
      }[this.tireCompound]
      heatRate *= compoundHeatMultiplier

      // Apply heating with cap at 125°C (overheating threshold)
      this.tireTemperature = Math.min(125.0, this.tireTemperature + heatRate)
    }

    // Natural cooling - enhanced model
    const ambientTemp = 25
    // Cooling rate depends on temperature difference (Newton's law of cooling)
    // Higher speeds = more airflow = faster cooling
    const airflowFactor = 1.0 + (this.speed / this.maxSpeed) * 0.5 // 1.0-1.5x
    const baseCoolingRate = (this.tireTemperature - ambientTemp) * 0.008 * timeStep
    const coolingRate = baseCoolingRate * airflowFactor
    this.tireTemperature = Math.max(ambientTemp, this.tireTemperature - coolingRate)

    // Add small random variation to prevent all drivers having identical temps
    if (Math.random() < 0.1) { // 10% chance per frame
      const variation = (Math.random() - 0.5) * 0.5 // ±0.25°C random fluctuation
      this.tireTemperature = Math.max(ambientTemp, Math.min(125, this.tireTemperature + variation))
    }

    // Reduced performance with tire wear - matches Python backend
    if (this.tireWear > 50) {
      const wearPenalty = (this.tireWear - 50) / 50 // 0 to 1
      this.corneringSkill = Math.max(0.7, 1.0 - wearPenalty * 0.3)
    }

    // Damage accumulation (random events, hard cornering)
    if (this.currentCurvature > 0 && this.speed > this.maxSpeed * 0.9) {
      if (Math.random() < 0.0001) { // 0.01% chance per step
        this.damageLevel = Math.min(100.0, this.damageLevel + Math.random() * 4 + 1)
      }
    }

    // Update total time
    this.totalTime += timeStep
  }

  /**
   * Activate DRS (only on straights)
   */
  activateDrs(): void {
    if (this.currentCurvature === 0) {
      this.drsActive = true
    }
  }

  /**
   * Set tire compound characteristics
   * Compounds: Soft (fast, high wear), Medium (balanced), Hard (durable, slower)
   *           Intermediate (light rain), Wet (heavy rain)
   */
  private setTireCompoundCharacteristics(compound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet'): void {
    switch (compound) {
      case 'soft':
        this.tireWearRate = 1.8  // Wears 80% faster
        this.tireGripLevel = 1.15 // 15% more grip
        this.mu = 1.8 * 1.15      // Enhanced base friction
        break
      case 'medium':
        this.tireWearRate = 1.0  // Baseline
        this.tireGripLevel = 1.0  // Baseline grip
        this.mu = 1.8
        break
      case 'hard':
        this.tireWearRate = 0.6  // Wears 40% slower
        this.tireGripLevel = 0.92 // 8% less grip
        this.mu = 1.8 * 0.92
        break
      case 'intermediate':
        this.tireWearRate = 0.9  // Slightly better than medium
        this.tireGripLevel = 0.85 // Less grip on dry
        this.mu = 1.8 * 0.85
        break
      case 'wet':
        this.tireWearRate = 0.7  // Very durable
        this.tireGripLevel = 0.7  // Poor on dry, excellent in rain
        this.mu = 1.8 * 0.7
        break
    }
  }

  /**
   * Change tire compound during pit stop
   */
  changeTireCompound(newCompound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet'): void {
    this.tireCompound = newCompound
    this.setTireCompoundCharacteristics(newCompound)
    console.log(`[${this.name}] Tire compound changed to ${newCompound}`)
  }

  /**
   * Deactivate DRS
   */
  deactivateDrs(): void {
    this.drsActive = false
  }

  /**
   * Check if vehicle is in slipstream of another
   */
  checkSlipstream(otherVehicles: RacingVehicle[], trackLength: number): void {
    this.inSlipstream = false
    const slipstreamDistance = 50.0 // meters

    for (const other of otherVehicles) {
      if (other.id === this.id) continue

      // Calculate distance considering track wrap-around
      let distance = other.position - this.position
      if (distance < 0) distance += trackLength

      if (distance > 0 && distance < slipstreamDistance && other.speed > this.speed) {
        this.inSlipstream = true
        break
      }
    }
  }

  /**
   * Plan pit stop strategy based on tire compounds
   */
  planPitStopStrategy(): void {
    // Default 1-stop strategy: Start medium, switch to hard
    // For longer races (>30 laps), plan 2 stops
    this.pitStopStrategy = ['medium', 'hard']
    this.nextPitLap = -1 // Will be calculated during race
  }

  /**
   * Check if pit stop is needed
   */
  shouldPitStop(currentLap: number, totalLaps: number, weather: string = 'clear', trackWaterLevel: number = 0): boolean {
    // Don't pit on first lap or last 2 laps
    if (currentLap <= 1 || currentLap >= totalLaps - 1) return false

    // Emergency pit for weather: wrong tires for track conditions
    if (trackWaterLevel > 70) {
      // Heavy water - need full wets
      if (this.tireCompound !== 'wet') {
        return true
      }
    } else if (trackWaterLevel > 20) {
      // Light-medium water - intermediates ideal
      if (this.tireCompound !== 'intermediate') {
        return true
      }
    } else if (trackWaterLevel < 5) {
      // Nearly dry - switch to slicks
      if (this.tireCompound === 'intermediate' || this.tireCompound === 'wet') {
        return true
      }
    }

    // Pit if tire wear is critical (>85%)
    if (this.tireWear > 85) return true

    // Pit if damage is significant (>60%)
    if (this.damageLevel > 60) return true

    // Strategic pit stop based on race progress
    if (this.nextPitLap === -1 && this.pitStops === 0) {
      // Plan first pit stop around 40-60% race distance
      const optimalLap = Math.floor(totalLaps * (0.4 + Math.random() * 0.2))
      this.nextPitLap = optimalLap
    }

    // Pit if at planned lap and tire wear > 50%
    if (currentLap >= this.nextPitLap && this.tireWear > 50) return true

    return false
  }

  /**
   * Choose next tire compound based on strategy, weather, and track water level
   */
  getNextTireCompound(weather: string = 'clear', trackWaterLevel: number = 0): 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet' {
    // Track water level determines tire choice
    if (trackWaterLevel > 70) {
      // Heavy water - full wets needed
      return 'wet'
    } else if (trackWaterLevel > 20) {
      // Light-medium water - intermediates optimal
      return 'intermediate'
    }

    // Dry or nearly dry - use slicks
    const stopIndex = this.pitStops

    // If we have a strategy, follow it
    if (stopIndex < this.pitStopStrategy.length) {
      return this.pitStopStrategy[stopIndex]
    }

    // Fallback: alternate between compounds
    if (this.tireCompound === 'soft') return 'medium'
    if (this.tireCompound === 'medium') return 'hard'
    return 'medium'
  }

  /**
   * Perform pit stop
   */
  pitStop(newCompound?: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet'): number {
    this.inPit = true

    // Log-logistic distribution for pit stop time
    // Base time: 2.5s, with variability
    const alpha = 2.5
    const beta = 0.3
    const u = Math.random()
    const pitDuration = alpha * Math.pow(u / (1 - u), 1 / beta)

    // Clamp to reasonable range (2.0s - 4.0s)
    const actualPitDuration = Math.max(2.0, Math.min(4.0, pitDuration))

    // Set pit time remaining (will be decremented each simulation step)
    this.pitTimeRemaining = actualPitDuration

    // Reset tire state with fresh tires
    this.tireWear = 0.0
    this.tireTemperature = 60.0 // Fresh cold tires

    // Change compound if specified
    if (newCompound) {
      this.changeTireCompound(newCompound)
    }

    this.corneringSkill = Math.max(this.corneringSkill, 1.0)

    // Partial damage repair
    this.damageLevel = Math.max(0.0, this.damageLevel - 50.0)

    this.pitStops++
    this.speed = 0.0
    this.totalTime += actualPitDuration

    // Reset next pit lap (will be recalculated)
    this.nextPitLap = -1

    console.log(`🔧 ${this.name} pitted on lap ${this.lap} (${actualPitDuration.toFixed(2)}s) - New tires: ${this.tireCompound.toUpperCase()}`)

    return actualPitDuration
  }

  /**
   * Calculate load transfer during acceleration/braking and cornering
   * Returns [frontLeft, frontRight, rearLeft, rearRight] loads in Newtons
   */
  private calculateLoadTransfer(lateralAccel: number, longitudinalAccel: number): number[] {
    // Static weight distribution
    const totalWeight = this.mass * this.g
    const frontStaticLoad = totalWeight * this.frontWeightDist
    const rearStaticLoad = totalWeight * (1 - this.frontWeightDist)

    // Longitudinal load transfer (braking/acceleration)
    const longLoadTransfer = (this.mass * longitudinalAccel * this.cgHeight) / this.wheelbase

    // Lateral load transfer (cornering)
    const latLoadTransfer = (this.mass * lateralAccel * this.cgHeight) / (0.5 * this.trackWidth)

    // Distribute to 4 wheels
    const frontLoad = frontStaticLoad - longLoadTransfer
    const rearLoad = rearStaticLoad + longLoadTransfer

    // Split left/right based on lateral transfer
    const frontLeft = frontLoad / 2 - latLoadTransfer / 2
    const frontRight = frontLoad / 2 + latLoadTransfer / 2
    const rearLeft = rearLoad / 2 - latLoadTransfer / 2
    const rearRight = rearLoad / 2 + latLoadTransfer / 2

    // Update state variables
    this.frontLoad = frontLoad
    this.rearLoad = rearLoad
    this.lateralLoad = latLoadTransfer

    return [frontLeft, frontRight, rearLeft, rearRight]
  }

  /**
   * Calculate differential effect on traction
   * Limited Slip Differential (LSD) model
   */
  private calculateDifferentialEffect(outerWheelSpeed: number, innerWheelSpeed: number): number {
    // Wheel speed difference (higher in tight corners)
    const speedDiff = Math.abs(outerWheelSpeed - innerWheelSpeed)

    // Differential parameters (kept for tuning reference)
    // Base preload torque: this.differentialPreload
    // Locking coefficient: 0.5 (Medium LSD)
    // Max torque: 500 Nm (typical F1 torque)

    // Traction boost/penalty
    // High preload = better traction out of corners but less rotation
    if (speedDiff < 5) {
      // Low wheel speed difference (straight or fast corner)
      this.tractionFactor = 1.0 + (this.differentialPreload / 1000)
    } else {
      // High wheel speed difference (tight corner)
      // Too much preload causes understeer, too little causes wheelspin
      const optimalPreload = 50.0
      const deviation = Math.abs(this.differentialPreload - optimalPreload)
      this.tractionFactor = 1.0 + ((100 - deviation) / 1000)
    }

    return this.tractionFactor
  }

  /**
   * Calculate engine braking effect
   * Returns deceleration in m/s²
   */
  private calculateEngineBraking(currentAccel: number): number {
    // Only applies when off throttle (not accelerating)
    if (currentAccel >= 0) {
      return 0
    }

    // RPM factor (higher speed = higher RPM = more engine braking)
    const rpmFactor = this.speed / this.maxSpeed

    // Base engine braking at max RPM
    const baseEngineBraking = -2.5 // m/s²

    // Scale by RPM and setting
    const engineBrakingForce = baseEngineBraking * rpmFactor * this.engineBraking

    return engineBrakingForce
  }

  /**
   * Calculate brake force distribution and detect lock-up
   * Returns effective braking deceleration
   */
  private calculateBrakeDistribution(
    requestedBraking: number,
    wheelLoads: number[]
  ): { deceleration: number; frontLocked: boolean; rearLocked: boolean } {
    const [frontLeft, frontRight, rearLeft, rearRight] = wheelLoads

    // Total brake force requested
    const totalBrakeForce = requestedBraking * this.mass

    // Distribute based on brake balance
    const frontBrakeForce = totalBrakeForce * this.brakeBalance
    const rearBrakeForce = totalBrakeForce * (1 - this.brakeBalance)

    // Maximum brake force before lock-up (limited by tire grip)
    const brakeCoef = 0.95 // Slightly less than tire friction
    const maxFrontBrake = this.mu * (frontLeft + frontRight) * brakeCoef
    const maxRearBrake = this.mu * (rearLeft + rearRight) * brakeCoef

    // Detect lock-up
    const frontLocked = frontBrakeForce > maxFrontBrake
    const rearLocked = rearBrakeForce > maxRearBrake

    // Actual brake forces (limited by grip)
    const actualFrontBrake = Math.min(frontBrakeForce, maxFrontBrake)
    const actualRearBrake = Math.min(rearBrakeForce, maxRearBrake)

    // Calculate brake efficiency
    const requestedTotal = frontBrakeForce + rearBrakeForce
    const actualTotal = actualFrontBrake + actualRearBrake
    this.brakeEfficiency = requestedTotal > 0 ? actualTotal / requestedTotal : 1.0

    // Lock-up penalty
    if (frontLocked || rearLocked) {
      this.brakeEfficiency *= 0.6 // 40% penalty for locked wheels
    }

    // Return effective deceleration
    const deceleration = (actualTotal / this.mass) * this.brakeEfficiency

    return { deceleration, frontLocked, rearLocked }
  }

  /**
   * Get RL state vector (13 dimensions)
   */
  getRLStateVector(): number[] {
    return [
      this.speed,
      this.currentCurvature,
      0, // distance_to_next_corner (would need track lookahead)
      this.tireTemperature,
      this.energy,
      this.differentialPreload,
      this.engineBraking,
      this.brakeBalance,
      this.frontLoad,
      this.rearLoad,
      this.lateralLoad,
      this.tractionFactor,
      this.downforceLevel
    ]
  }

  /**
   * Get RL reward signal (-15 to +14)
   */
  getRLReward(): number {
    // Lap time reward: -10 to +10
    // (would need reference lap time)
    const lapTimeReward = 0

    // Efficiency reward: -5 to +2
    const energyEfficiency = this.energy / 100
    const tireEfficiency = 1.0 - (this.tireWear / 100)
    const brakeEff = this.brakeEfficiency
    const efficiencyReward = (energyEfficiency + tireEfficiency + brakeEff - 1.5) * 2

    // Consistency reward: 0 to +1
    const consistencyReward = this.brakeEfficiency > 0.9 ? 1.0 : 0.5

    // Safety reward: 0 to +1
    const safetyReward = this.damageLevel === 0 ? 1.0 : 0.0

    return lapTimeReward + efficiencyReward + consistencyReward + safetyReward
  }

  /**
   * Adjust differential preload (for RL training)
   */
  adjustDifferential(delta: number): void {
    this.differentialPreload = Math.max(0, Math.min(100, this.differentialPreload + delta))
  }

  /**
   * Adjust engine braking (for RL training)
   */
  adjustEngineBraking(delta: number): void {
    this.engineBraking = Math.max(0, Math.min(1, this.engineBraking + delta))
  }

  /**
   * Adjust brake balance (for RL training)
   */
  adjustBrakeBalance(delta: number): void {
    this.brakeBalance = Math.max(0, Math.min(1, this.brakeBalance + delta))
  }

  /**
   * Update vehicle parameters in realtime
   */
  updateMaxSpeed(newMaxSpeed: number): void {
    this.maxSpeed = newMaxSpeed
    console.log(`[${this.name}] Max speed updated to ${newMaxSpeed} m/s`)
  }

  updateAcceleration(newAcceleration: number): void {
    this.acceleration = newAcceleration
    console.log(`[${this.name}] Acceleration updated to ${newAcceleration} m/s²`)
  }

  updateBrakingRate(newBrakingRate: number): void {
    this.brakingRate = newBrakingRate
  }

  updateCorneringSkill(newCorneringSkill: number): void {
    this.corneringSkill = newCorneringSkill
  }

  updateDnfProbability(newDnfProbability: number): void {
    this.dnfProbability = newDnfProbability
  }

  updateDifferentialPreload(newDifferentialPreload: number): void {
    this.differentialPreload = newDifferentialPreload
  }

  updateEngineBraking(newEngineBraking: number): void {
    this.engineBraking = newEngineBraking
  }

  updateBrakeBalance(newBrakeBalance: number): void {
    this.brakeBalance = newBrakeBalance
  }

  /**
   * Complete a lap
   */
  completeLap(lapTime: number, gapToLeader: number = 0, gapToAhead: number = 0): void {
    this.lap++
    this.lapTimes.push(lapTime)

    // Save detailed telemetry for this lap
    const telemetry: LapTelemetry = {
      lapNumber: this.lap,
      lapTime: lapTime,
      tireWearStart: this.lapTireWearStart,
      tireWearEnd: this.tireWear,
      tireCompound: this.tireCompound,
      avgTireTemp: this.lapTireTempSamples > 0 ? this.lapTireTempSum / this.lapTireTempSamples : this.tireTemperature,
      maxTireTemp: this.lapTireTempMax,
      minTireTemp: this.lapTireTempMin < 999 ? this.lapTireTempMin : this.tireTemperature,
      energyStart: this.lapEnergyStart,
      energyEnd: this.energy,
      energyUsed: this.lapEnergyStart - this.energy,
      damageStart: this.lapDamageStart,
      damageEnd: this.damageLevel,
      avgSpeed: this.lapSpeedSamples > 0 ? this.lapSpeedSum / this.lapSpeedSamples : this.speed,
      maxSpeed: this.lapMaxSpeed,
      topSpeed: this.lapMaxSpeed * 3.6, // Convert to km/h
      overtakesMade: this.lapOvertakes,
      drsUsageTime: this.lapDrsTime,
      slipstreamTime: this.lapSlipstreamTime,
      position: this.currentPosition,
      gapToLeader: gapToLeader,
      gapToAhead: gapToAhead,
      pitStopThisLap: this.lapPitStop,
      pitStopDuration: this.lapPitDuration
    }

    this.lapTelemetry.push(telemetry)

    // Reset lap tracking for next lap
    this.lapStartTime = this.totalTime
    this.lapEnergyStart = this.energy
    this.lapTireWearStart = this.tireWear
    this.lapDamageStart = this.damageLevel
    this.lapSpeedSum = 0
    this.lapSpeedSamples = 0
    this.lapMaxSpeed = 0
    this.lapTireTempSum = 0
    this.lapTireTempSamples = 0
    this.lapTireTempMax = 0
    this.lapTireTempMin = 999
    this.lapOvertakes = 0
    this.lapDrsTime = 0
    this.lapSlipstreamTime = 0
    this.lapPitStop = false
    this.lapPitDuration = 0
  }

  /**
   * Check if vehicle can overtake another
   */
  canOvertake(other: RacingVehicle, _trackLength: number): boolean {
    // Calculate pace advantage
    const paceAdvantage = this.speed - other.speed

    // DRS bonus
    const drsBonus = this.drsActive && !other.drsActive ? 5.0 : 0

    // Straight line speed difference
    const straightLineAdvantage = (this.maxSpeed - other.maxSpeed) * 0.5

    // Total advantage
    const totalAdvantage = paceAdvantage + drsBonus + straightLineAdvantage

    // Dynamic overtaking threshold (harder in corners)
    const overtakingThreshold = this.currentCurvature > 0 ? 8.0 : 3.0

    return totalAdvantage > overtakingThreshold
  }

  /**
   * Get current vehicle state
   */
  getState(): VehicleState {
    return {
      id: this.id,
      name: this.name,
      vehicleType: this.vehicleType,
      position: this.position,
      speed: this.speed,
      lap: this.lap,
      finished: this.finished,
      totalTime: this.totalTime,
      energy: Math.round(this.batteryStateOfCharge * 100) / 100,
      tireWear: Math.round(this.tireWear * 100) / 100,
      tireTemperature: Math.round(this.tireTemperature * 10) / 10,
      tireCompound: this.tireCompound,
      drsActive: this.drsActive,
      inSlipstream: this.inSlipstream,
      damageLevel: Math.round(this.damageLevel * 10) / 10,
      pitStops: this.pitStops,
      currentPosition: this.currentPosition,
      justCrossedLine: this.justCrossedLine,
      gapToAhead: Math.round(this.gapToAhead * 100) / 100,
      inPit: this.inPit,
      nextPitLap: this.nextPitLap,
      // Battery telemetry
      batteryPower: Math.round(this.batteryPower * 10) / 10,
      batteryChargingPower: Math.round(this.batteryChargingPower * 10) / 10,
      batteryTemperature: Math.round(this.batteryTemperature * 10) / 10,
      ersHarvestedEnergy: Math.round(this.ersHarvestedEnergy * 100) / 100,
      ersDeployedEnergy: Math.round(this.ersDeployedEnergy * 100) / 100
    }
  }
}

export class RacingBike extends RacingVehicle {
  constructor(config: VehicleConfig) {
    super(config);

    // Bike-specific physics parameters
    this.mass = config.mass || 180; // kg (MotoGP bike)
    this.dragCoefficient = config.dragCoefficient || 0.6;
    this.frontalArea = config.frontalArea || 0.7; // m²
    this.downforceCoefficient = config.downforceCoefficient || 0.5; // Bikes have much less downforce
    this.corneringSkill = config.corneringSkill || 1.5; // Bikes can lean and take corners faster

    // Aliases for calculations
    this.Cd = this.dragCoefficient;
    this.A = this.frontalArea;
    this.Cl = this.downforceCoefficient;
  }
}
