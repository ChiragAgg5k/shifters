// Export all simulation modules
export { RacingVehicle } from './physics/RacingVehicle'
export type { VehicleConfig, VehicleState } from './physics/RacingVehicle'

export { Track } from './track/Track'
export type { TrackSegment, TrackInfo } from './track/Track'

export { RaceSimulation } from './simulation/RaceSimulation'
export type { SimulationState } from './simulation/RaceSimulation'

export { useRaceSimulation } from './hooks/useRaceSimulation'
export type { RaceConfig } from './hooks/useRaceSimulation'

export { F1_CIRCUITS } from './data/circuits'
export type { Circuit } from './data/circuits'
