/**
 * F1 Racing Vehicle Physics Engine
 * Port of Python base_agent.py with full F1-metrics inspired physics
 */

export interface VehicleConfig {
  id: string
  name: string
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
}

export interface VehicleState {
  id: string
  name: string
  position: number
  speed: number
  lap: number
  finished: boolean
  totalTime: number
  energy: number
  tireWear: number
  tireTemperature: number
  drsActive: boolean
  inSlipstream: boolean
  damageLevel: number
  pitStops: number
  currentPosition: number
  justCrossedLine: boolean
}

export class RacingVehicle {
  // Identity
  id: string
  name: string

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

  // Energy and tire management
  energy: number = 100
  tireWear: number = 0
  tireTemperature: number = 85 // Start with warm tires

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

  // Track state
  currentCurvature: number = 0

  // DNF tracking
  lastDnfCheckLap: number = -1
  justCrossedLine: boolean = false

  constructor(config: VehicleConfig) {
    this.id = config.id
    this.name = config.name
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
    this.dnfProbability = config.dnfProbability || 0.02
    this.gridPenalty = (this.qualifyingPosition - 1) * 0.25

    this.currentPosition = this.qualifyingPosition
  }

  /**
   * Calculate target speed based on track curvature, weather, and vehicle state
   * Enhanced with proper force balance and load-sensitive tire model
   */
  calculateTargetSpeed(curvature: number, weather: string, _trackTemp: number): void {
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
      // Straight: full speed with traction factor
      this.targetSpeed = this.maxSpeed * this.tractionFactor
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
    if (weather === 'rain') {
      gripMultiplier = 0.7 // 30% less grip in rain
    } else if (weather === 'wet') {
      gripMultiplier = 0.85 // 15% less grip on wet track
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
  }

  /**
   * Update vehicle physics for one time step
   * Enhanced with load transfer, differential, engine braking, and brake balance
   */
  move(timeStep: number, trackLength: number): void {
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

    // Calculate movement
    const baseMovement = this.speed * timeStep
    const variationDistance = -lapTimeVariation * (this.speed / 10.0)
    const penaltyDistance = -overtakePenalty * (this.speed / 10.0)

    let movement = baseMovement + variationDistance + penaltyDistance
    movement = Math.max(0, movement)

    this.position += movement
    this.distanceTraveled += movement

    // Normalize position for circuit tracks
    this.justCrossedLine = false
    if (this.position >= trackLength) {
      this.position = this.position % trackLength
      this.justCrossedLine = true
    }

    // Energy consumption
    const speedFactor = this.speed / this.maxSpeed
    const accelFactor = Math.abs(this.speed - this.targetSpeed) / this.maxSpeed
    const dragFactor = dragForce / 1000.0

    const energyConsumption = (speedFactor * 0.01 + accelFactor * 0.005 + dragFactor * 0.002) * timeStep
    this.energy = Math.max(0, this.energy - energyConsumption)

    // Tire wear (cornering, braking, high speed, and dirty air) - matches Python backend
    if (this.currentCurvature > 0) {
      let wearRate = (this.speed / this.maxSpeed) * 0.001 * timeStep
      // Dirty air increases tire wear by 10% (F1-metrics inspired)
      if (this.inSlipstream) {
        wearRate *= 1.1
      }
      this.tireWear = Math.min(100.0, this.tireWear + wearRate)
    }

    // Hard braking increases tire wear
    if (this.speed > this.targetSpeed) {
      const brakingFactor = Math.abs(this.speed - this.targetSpeed) / this.maxSpeed
      const brakeWear = brakingFactor * 0.0005 * timeStep
      this.tireWear = Math.min(100.0, this.tireWear + brakeWear)
    }

    // Tire temperature management - matches Python backend
    // Tires heat up with use (any speed > 0)
    if (this.speed > 0) {
      let heatRate = (this.speed / this.maxSpeed) * 2.0 * timeStep
      if (this.currentCurvature > 0) {
        heatRate *= 1.5 // Cornering generates more heat
      }
      this.tireTemperature = Math.min(120.0, this.tireTemperature + heatRate)
    }

    // Tires cool down naturally (will be enhanced by weather in RaceSimulation)
    const ambientTemp = 25
    const coolingRate = (this.tireTemperature - ambientTemp) * 0.01 * timeStep
    this.tireTemperature = Math.max(ambientTemp, this.tireTemperature - coolingRate)

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
   * Perform pit stop
   */
  pitStop(): number {
    // Log-logistic distribution for pit stop time
    // Base time: 2.5s, with variability
    const alpha = 2.5
    const beta = 0.3
    const u = Math.random()
    const pitDuration = alpha * Math.pow(u / (1 - u), 1 / beta)

    // Clamp to reasonable range (2.0s - 4.0s)
    const actualPitDuration = Math.max(2.0, Math.min(4.0, pitDuration))

    // Reset tire state
    this.tireWear = 0.0
    this.tireTemperature = 60.0 // Fresh cold tires
    this.corneringSkill = Math.max(this.corneringSkill, 1.0)

    // Partial damage repair
    this.damageLevel = Math.max(0.0, this.damageLevel - 50.0)

    this.pitStops++
    this.speed = 0.0
    this.totalTime += actualPitDuration

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
  }

  updateAcceleration(newAcceleration: number): void {
    this.acceleration = newAcceleration
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
  completeLap(lapTime: number): void {
    this.lap++
    this.lapTimes.push(lapTime)
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
      position: this.position,
      speed: this.speed,
      lap: this.lap,
      finished: this.finished,
      totalTime: this.totalTime,
      energy: Math.round(this.energy * 100) / 100,
      tireWear: Math.round(this.tireWear * 100) / 100,
      tireTemperature: Math.round(this.tireTemperature * 10) / 10,
      drsActive: this.drsActive,
      inSlipstream: this.inSlipstream,
      damageLevel: Math.round(this.damageLevel * 10) / 10,
      pitStops: this.pitStops,
      currentPosition: this.currentPosition,
      justCrossedLine: this.justCrossedLine
    }
  }
}
