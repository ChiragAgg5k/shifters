# Shifters - F1 Race Simulator

An advanced F1 racing simulation platform with realistic physics, real-time 3D visualization, and comprehensive telemetry analysis. Built with TypeScript/React frontend.

![Platform](https://img.shields.io/badge/platform-electron-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-success)

## Quick Start

```bash
cd frontend
pnpm install
pnpm dev          # Web version at localhost:3000
pnpm electron:dev # Desktop app
```

**That's it!** Select a circuit, configure race parameters, and hit "Start Race" to see the F1 simulation in action.

## Table of Contents

- [Current Status](#current-status)
- [Key Features](#key-features)
- [Installation & Quick Start](#installation--quick-start)
- [Available F1 Circuits](#available-f1-circuits-2024-season)
- [Technical Architecture](#technical-architecture)
- [Physics Highlights](#physics-highlights)
- [Roadmap](#roadmap)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)

## Current Status

**🎮 Frontend (Next.js + Three.js)** - Fully Functional Electron App
- ✅ Real-time 3D race visualization with Three.js
- ✅ 2D race track visualization with SVG
- ✅ Advanced physics simulation engine (differential, brake balance, engine braking)
- ✅ Per-vehicle customization (cars/bikes with individual parameters)
- ✅ Dynamic weather system (rain probability, track water level)
- ✅ Safety car deployment
- ✅ DNF (Did Not Finish) system
- ✅ Pit stop strategy simulation
- ✅ Live leaderboard with real-time telemetry
- ✅ Post-race comprehensive reports with Recharts
- ✅ 22 authentic F1 2024 circuits from real GPS data
- ✅ Electron desktop application (macOS/Windows/Linux)

**🏎️ Key Features**

- **Advanced Physics**: Realistic racing dynamics including tire wear, energy management, DRS, slipstream effects
- **Vehicle Types**: Support for both F1 cars and bikes with different 3D models
- **Real-Time Controls**: Adjust simulation speed, track temperature, weather, and vehicle parameters during race
- **Telemetry Analytics**: Track tire wear, speed, energy consumption, and tire temperature lap-by-lap
- **Strategic Depth**: Pit stop optimization, tire compound selection, fuel/energy management
- **3D Visualization**: Dynamic camera controls, authentic track rendering, vehicle positioning

## Project Structure

```
shifters/
├── frontend/                      # Next.js + React + Three.js Application
│   ├── app/                      # Next.js app directory
│   │   ├── page.tsx             # Main race interface
│   │   └── layout.tsx           # App layout
│   ├── components/               # React components
│   │   ├── ControlDeck.tsx      # Race controls and configuration
│   │   ├── Race3DVisualization.tsx  # Three.js 3D rendering
│   │   ├── RaceVisualization.tsx    # 2D SVG visualization
│   │   ├── DataGrid.tsx         # Live leaderboard
│   │   ├── RaceReport.tsx       # Post-race analytics
│   │   └── ConnectionStatus.tsx # Connection indicator
│   ├── lib/                      # Core simulation logic
│   │   ├── simulation/          # Race simulation engine
│   │   ├── physics/             # Vehicle physics and dynamics
│   │   ├── track/               # Track management and curvature
│   │   └── hooks/               # React hooks
│   ├── public/data/circuits/    # F1 2024 circuit GPS data
│   ├── electron/                # Electron main process
│   └── package.json             # Dependencies and scripts
│
└── (Python backend - legacy/deprecated)
```

## Installation & Quick Start

### Prerequisites
- Node.js 18+ and pnpm (for frontend)
- Electron support for desktop app

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Development mode (web browser)
pnpm dev
# Opens at http://localhost:3000

# Electron desktop app (development)
pnpm electron:dev

# Build Electron app for production
pnpm electron:build:mac    # macOS
pnpm electron:build:win    # Windows
pnpm electron:build:linux  # Linux
```

### Running Your First Race

1. **Configure Race Parameters**:
   - Number of agents (2-20 vehicles)
   - Number of laps (1-100)
   - Select circuit from 22 F1 2024 tracks
   - Adjust track temperature (10-60°C)
   - Set rain probability (0-100%)
   - Choose simulation speed (0.5x - 10x)

2. **Customize Vehicle Performance** (Optional):
   - Global settings: Max speed, acceleration, DNF probability, cornering skill
   - Advanced physics: Differential preload, engine braking, brake balance
   - Per-vehicle customization: Set individual parameters for each agent
   - Vehicle type selection: Choose between F1 cars and bikes

3. **Start Race**: Click "Start Race" and watch the action unfold in real-time

4. **View Results**: After the race, review comprehensive telemetry data and final classification

### Available F1 Circuits (2024 Season)

Monaco, Bahrain, Saudi Arabia, Australia, Japan, China, Miami, Imola, Monaco, Canada, Spain, Austria, Great Britain, Hungary, Belgium, Netherlands, Italy, Azerbaijan, Singapore, USA, Mexico, Brazil, Las Vegas, Abu Dhabi

## Technical Architecture

### Core Simulation (`frontend/lib/simulation/`)
- **RaceSimulation.ts**: Main simulation engine with discrete time-stepping
- Physics updates at configurable intervals (default: 0.1s steps)
- Safety car deployment logic with automatic trigger on DNF events
- Dynamic weather transitions based on rain probability
- Position tracking and gap calculations

### Physics Engine (`frontend/lib/physics/`)
- **RacingVehicle.ts**: Advanced vehicle physics simulation
  - Tire wear degradation based on speed, temperature, and cornering
  - Energy management with consumption modeling
  - DRS (Drag Reduction System) activation on straights
  - Slipstream effect when following other vehicles
  - Brake balance and differential preload impact on cornering
  - Engine braking simulation
  - Weather-dependent grip levels

### Track System (`frontend/lib/track/`)
- **Track.ts**: Circuit representation with GPS coordinate parsing
- Curvature calculation using finite differences
- Support for 22 real F1 2024 circuits
- Track length and segment analysis

### Visualization
- **3D Rendering**: Three.js with OrbitControls for camera manipulation
- **2D Rendering**: SVG-based track visualization with real-time position updates
- **Responsive Design**: Tailwind CSS with custom dark theme

## Physics Highlights

### Tire Dynamics
- Compound-specific wear rates (Soft/Medium/Hard)
- Temperature management (optimal window: 80-100°C)
- Rain tire automatic switching based on track water level
- Degradation affects grip and cornering speed

### Energy System
- Battery/fuel consumption based on throttle and speed
- Regenerative braking under deceleration
- Strategic energy management for race finish

### Advanced Parameters
- **Differential Preload** (0-100 Nm): Affects power distribution in corners
- **Engine Braking** (0-100%): Natural deceleration when off throttle
- **Brake Balance** (40-70% front): Distribution of braking force

## Roadmap

- [x] ~~3D visualization with Three.js~~
- [x] ~~Real-time telemetry and analytics~~
- [x] ~~Advanced physics (differential, brake balance)~~
- [x] ~~Per-vehicle customization~~
- [x] ~~Electron desktop application~~
- [ ] Multiplayer race viewing
- [ ] AI-driven racing strategies
- [ ] Weather radar and forecasting
- [ ] Tire compound strategy optimizer
- [ ] Export race data to CSV/JSON
- [ ] Replay system with playback controls
- [ ] Team management (constructors championship)
- [ ] Custom circuit editor
- [ ] VR/AR visualization support

## Development

### Frontend Development

```bash
cd frontend

# Install dependencies
pnpm install

# Development server (hot reload)
pnpm dev

# Type checking
pnpm run tsc --noEmit

# Build for production
pnpm build

# Electron development with hot reload
pnpm electron:dev
```

### Code Structure Guidelines

- **Components**: Keep React components focused and reusable
- **Simulation Logic**: Separate physics calculations from rendering
- **State Management**: Use React hooks for local state, consider Context for global state
- **Performance**: Optimize Three.js rendering with useMemo and useFrame
- **TypeScript**: Maintain strict type safety, define proper interfaces

### Adding New Circuits

1. Obtain GPS coordinates as array of `{lat, lng}` or `{x, y}` points
2. Add to `/frontend/public/data/circuits/f1-2024-circuits.json`
3. Follow the existing format with circuit metadata
4. Circuit will automatically appear in dropdown selector

### Adding New Vehicle Types

1. Create 3D model component in `Race3DVisualization.tsx`
2. Add vehicle type to `VehicleConfig` interface
3. Update physics parameters in `RacingVehicle.ts`
4. Add UI controls in `ControlDeck.tsx`

## Tech Stack

**Frontend**
- Next.js 14 (React framework)
- TypeScript (type safety)
- Three.js (@react-three/fiber, @react-three/drei) - 3D rendering
- Recharts (telemetry visualization)
- Tailwind CSS (styling)
- Radix UI (UI components)
- Electron (desktop app)

**Build & Development**
- pnpm (package manager)
- Electron Builder (app packaging)
- Concurrently (parallel processes)

## Performance Optimization

- Simulation runs at configurable FPS (default: 10 Hz)
- Three.js rendering optimized with instancing and geometry reuse
- Memoized track curve calculations
- Efficient position updates using RAF (requestAnimationFrame)
- Telemetry data collection only when needed

## Contributing

Contributions welcome! Areas for improvement:

1. **Physics Enhancements**: More realistic aero, suspension modeling
2. **UI/UX**: Mobile responsiveness, accessibility improvements
3. **Features**: Race replays, data export, circuit editor
4. **Performance**: WebGL optimizations, Web Workers for simulation
5. **Testing**: Unit tests, integration tests, E2E tests

## Screenshots

![ss1](/docs/ss1.png)
![ss2](/docs/ss2.png)

## License

MIT License

---

**Built with ❤️ for F1 simulation enthusiasts**
