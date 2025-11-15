# Pure Frontend F1 Simulator

## Overview

The F1 simulator has been completely ported to run entirely in the browser using TypeScript/React. **No backend required!** 🚀

## Architecture

### Core Systems

1. **Physics Engine** (`lib/physics/RacingVehicle.ts`)
   - Aerodynamic drag and downforce calculations
   - DRS (Drag Reduction System) mechanics
   - Slipstreaming effects
   - Tire physics (wear, temperature, grip)
   - Energy management and fuel consumption
   - Damage accumulation system
   - Driver consistency variations

2. **Track System** (`lib/track/Track.ts`)
   - GeoJSON circuit parsing
   - Curvature-based segment analysis
   - Lap completion detection
   - Position normalization for circuit tracks

3. **Simulation Engine** (`lib/simulation/RaceSimulation.ts`)
   - Race coordination and lifecycle management
   - Safety car deployment logic
   - DNF (Did Not Finish) probability checks
   - Position tracking and overtaking
   - Lap timing and leaderboard management

4. **React Hook** (`lib/hooks/useRaceSimulation.ts`)
   - Manages simulation lifecycle
   - Fixed 10 FPS update loop using `requestAnimationFrame`
   - State synchronization with React components

5. **Circuit Data** (`lib/data/circuits.ts`)
   - Pre-loaded F1 circuits with GeoJSON coordinates
   - Includes: Monaco, Silverstone, Spa, Melbourne, Monza

### Frontend Components

- **RaceVisualization**: Real-time track visualization with agent positions
- **ControlDeck**: Race configuration and controls
- **DataGrid**: Live telemetry display

## How It Works

### Starting a Race

1. User configures race parameters in ControlDeck:
   - Number of agents (2-20)
   - Number of laps (1-100)
   - Circuit selection
   - Track temperature (10-60°C)
   - Rain probability (0-100%)

2. `useRaceSimulation` hook creates:
   - Track from GeoJSON coordinates
   - RacingVehicle agents with F1-inspired characteristics
   - RaceSimulation instance

3. Animation loop runs at 10 FPS:
   - Physics calculations for each vehicle
   - Track curvature-based speed adjustments
   - Tire wear and temperature updates
   - Energy consumption tracking
   - DNF probability checks
   - Position updates and overtaking logic

### Physics Model

**Speed Calculation:**
- Base speed from track curvature
- Weather effects on grip (rain = 15% grip loss)
- Tire temperature effects on grip
- Downforce contribution to cornering speed
- Damage reduction on cornering ability

**Movement:**
- Aerodynamic drag: `F_drag = 0.5 * ρ * Cd * A * v²`
- DRS reduces drag by 25% on straights
- Slipstream reduces drag by 30%
- Downforce: `F_downforce = 0.5 * ρ * Cl * A * v²`

**Tire Physics:**
- Wear increases with cornering and high speed
- Dirty air (slipstream) increases wear by 30%
- Temperature heating based on speed and cornering
- Temperature cooling at low speeds
- Grip affected by temperature deviation from optimal (90°C)

**Energy Management:**
- Consumption based on speed, acceleration, and drag
- Reduced power mode when energy < 10%

**DNF System:**
- Probability-based DNF checks once per lap
- Default 2% DNF probability per race
- 30% chance of safety car deployment on DNF

### Race Strategy

- **Pit Stops**: Log-logistic distribution for realistic pit durations (2.0-4.0 seconds)
- **Tire Reset**: Fresh tires after pit stop
- **Damage Repair**: Partial damage repair during pit stop
- **DRS Management**: Automatic activation on straights, deactivation in corners
- **Slipstreaming**: Automatic detection when following another car within 50m

## Usage

### Starting the Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

### Configuration

No backend configuration needed! Everything runs in the browser.

### Supported Circuits

- 🏎️ Circuit de Monaco (3,337m)
- 🏎️ Silverstone Circuit (5,891m)
- 🏎️ Circuit de Spa-Francorchamps (7,004m)
- 🏎️ Albert Park Circuit (5,278m)
- 🏎️ Autodromo Nazionale Monza (5,793m)

## Performance

- **Update Rate**: 10 FPS (100ms per step)
- **Simulation Time**: Real-time (1 second = 1 second)
- **Agents**: Supports up to 20 vehicles
- **Browser Compatibility**: Modern browsers with ES2020+ support

## Data Flow

```
ControlDeck (User Input)
    ↓
useRaceSimulation Hook
    ↓
RaceSimulation Engine
    ├─ RacingVehicle.move() (Physics)
    ├─ Track.getCurvature() (Track Data)
    └─ Position Updates
    ↓
React State Update
    ↓
RaceVisualization + DataGrid (Display)
```

## Key Features

✅ **Full F1 Physics**
- Aerodynamics, DRS, slipstreaming
- Tire wear and temperature
- Energy management
- Damage system

✅ **Race Strategy**
- Pit stop variability
- Safety car logic
- DNF probability
- Overtaking mechanics

✅ **Real-time Visualization**
- Live track rendering
- Agent position tracking
- Telemetry display
- Weather conditions

✅ **No Backend Required**
- Pure frontend implementation
- No server dependencies
- Deploy anywhere (GitHub Pages, Vercel, etc.)

## Future Enhancements

- [ ] Add Three.js 3D visualization
- [ ] Implement qualifying sessions
- [ ] Add tire compound selection
- [ ] Implement fuel weight effects
- [ ] Add race incidents (collisions, spins)
- [ ] Implement track evolution (grip increases over laps)
- [ ] Add replay functionality
- [ ] Implement telemetry graphs

## Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Physics**: Custom F1-metrics inspired engine
- **Rendering**: Canvas 2D (upgradeable to Three.js)
- **State Management**: React hooks
- **Styling**: Tailwind CSS + shadcn/ui

## Notes

- The simulator is deterministic (same seed = same race)
- All calculations are performed in the browser
- No network requests during race simulation
- Suitable for analysis, testing, and visualization
