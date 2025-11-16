# Racing Simulator - System Architecture

## System Overview

```mermaid
graph TB
    subgraph "User Interface Layer"
        MainPage["🏠 Main Page<br/>Simulation Mode"]
        PlayerPage["🎮 Player Page<br/>Single Agent Control"]
        OptimizePage["🧠 Optimize Page<br/>ML Parameter Tuning"]
    end
    
    subgraph "React Hooks Layer"
        useRaceSim["useRaceSimulation<br/>Multi-agent race management"]
        usePlayerSim["usePlayerRaceSimulation<br/>Player vs AI racing"]
        useOpt["useOptimization<br/>Genetic algorithm control"]
    end
    
    subgraph "Core Simulation Engine"
        RaceSim["RaceSimulation<br/>- Race orchestration<br/>- Step simulation<br/>- State management"]
        Vehicle["RacingVehicle<br/>- Physics engine<br/>- Tire model<br/>- Energy management"]
        Bike["RacingBike<br/>- Bike-specific physics<br/>- Lean dynamics"]
        Track["Track<br/>- Circuit geometry<br/>- Checkpoints<br/>- Distance calc"]
    end
    
    subgraph "ML/AI Layer"
        GeneticOpt["GeneticOptimizer<br/>- Population evolution<br/>- Tournament selection<br/>- Crossover & mutation"]
        Individual["Individual<br/>- Parameter sets<br/>- Fitness scoring"]
        Stats["GenerationStats<br/>- History tracking<br/>- Performance metrics"]
    end
    
    subgraph "Visualization Components"
        DataGrid["DataGrid<br/>Live leaderboard"]
        RaceViz2D["RaceVisualization<br/>2D track view"]
        RaceViz3D["Race3DVisualization<br/>3D scene (Three.js)"]
        ControlDeck["ControlDeck<br/>Multi-agent controls"]
        EvolutionChart["ParameterEvolutionChart<br/>ML progress graphs"]
    end
    
    subgraph "Data Sources"
        GeoJSON["GeoJSON Circuits<br/>F1 track coordinates"]
        CircuitData["Circuit Metadata<br/>Names, locations"]
    end
    
    MainPage --> useRaceSim
    PlayerPage --> usePlayerSim
    OptimizePage --> useOpt
    
    useRaceSim --> RaceSim
    usePlayerSim --> RaceSim
    useOpt --> GeneticOpt
    useOpt --> RaceSim
    
    RaceSim --> Vehicle
    RaceSim --> Bike
    RaceSim --> Track
    
    GeneticOpt --> Individual
    GeneticOpt --> Stats
    
    MainPage --> DataGrid
    MainPage --> RaceViz2D
    MainPage --> RaceViz3D
    MainPage --> ControlDeck
    
    PlayerPage --> DataGrid
    PlayerPage --> RaceViz2D
    PlayerPage --> RaceViz3D
    
    OptimizePage --> DataGrid
    OptimizePage --> EvolutionChart
    
    Track --> GeoJSON
    Track --> CircuitData
    
    style MainPage fill:#4ade80
    style PlayerPage fill:#fbbf24
    style OptimizePage fill:#a855f7
    style GeneticOpt fill:#ec4899
    style RaceSim fill:#3b82f6
```

## Detailed Data Flow - Race Simulation

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Component
    participant Hook as useRaceSimulation
    participant RaceSim as RaceSimulation
    participant Vehicle as RacingVehicle
    participant Track as Track System
    
    User->>UI: Configure race (agents, laps, circuit)
    UI->>Hook: startRace(config)
    
    Hook->>Track: Create from GeoJSON(coordinates, laps)
    Track-->>Hook: Track instance
    
    Hook->>RaceSim: new RaceSimulation(track, weather, temp)
    
    loop For each agent
        Hook->>Vehicle: new RacingVehicle(config)
        Hook->>RaceSim: addVehicle(vehicle)
    end
    
    Hook->>RaceSim: start()
    RaceSim-->>Hook: running = true
    
    loop Animation Frame Loop
        Hook->>RaceSim: stepSimulation()
        
        RaceSim->>Track: Get current curvature
        Track-->>RaceSim: curvature value
        
        loop For each vehicle
            RaceSim->>Vehicle: updatePhysics(dt, curvature, weather)
            Vehicle->>Vehicle: Calculate tire degradation
            Vehicle->>Vehicle: Update energy (ERS/fuel)
            Vehicle->>Vehicle: Check DNF probability
            Vehicle->>Vehicle: Apply DRS/slipstream
            Vehicle-->>RaceSim: Updated vehicle state
        end
        
        RaceSim->>RaceSim: Update positions/rankings
        RaceSim->>RaceSim: Check lap completion
        RaceSim->>RaceSim: Update weather dynamics
        RaceSim->>RaceSim: Safety car logic
        
        RaceSim-->>Hook: getState()
        Hook-->>UI: raceState
        UI-->>User: Update visualization
    end
    
    RaceSim->>RaceSim: Race complete (all finished)
    RaceSim->>RaceSim: generateRaceReport()
    RaceSim-->>Hook: Race report data
    Hook-->>UI: Display report
```

## ML Optimization Flow

```mermaid
flowchart TD
    Start([User Starts Optimization]) --> Init[Initialize GeneticOptimizer<br/>- Population size<br/>- Mutation rate<br/>- Max generations]
    
    Init --> GenPop[Generate Random Population<br/>Each individual = parameter set]
    
    GenPop --> EvalGen{Evaluate Generation}
    
    EvalGen --> EvalInd[For each individual]
    
    EvalInd --> RunRace[Run Race with Parameters<br/>- differential<br/>- engine braking<br/>- brake balance<br/>- max speed<br/>- acceleration]
    
    RunRace --> Measure[Measure Performance<br/>- Avg lap time<br/>- Best lap time<br/>- Position<br/>- DNF status]
    
    Measure --> CalcFit[Calculate Fitness<br/>fitness = 10000/lapTime<br/>+ positionBonus<br/>+ consistencyBonus]
    
    CalcFit --> NextInd{More individuals?}
    
    NextInd -->|Yes| EvalInd
    NextInd -->|No| RecordStats[Record Generation Stats<br/>- Best fitness<br/>- Avg fitness<br/>- Best lap time]
    
    RecordStats --> CheckComplete{Generation >= Max<br/>OR<br/>Target fitness reached?}
    
    CheckComplete -->|Yes| Complete([Optimization Complete<br/>Return best parameters])
    
    CheckComplete -->|No| Sort[Sort by Fitness<br/>Best to Worst]
    
    Sort --> Elite[Keep Elite<br/>Top 10% preserved]
    
    Elite --> Select[Tournament Selection<br/>Pick parents for breeding]
    
    Select --> Crossover[Crossover/Breeding<br/>child = parent1 * α + parent2 * (1-α)]
    
    Crossover --> Mutate[Mutation<br/>15% chance per parameter<br/>Small random adjustments]
    
    Mutate --> NewPop[New Population Created]
    
    NewPop --> NextGen[Increment Generation]
    
    NextGen --> EvalGen
    
    style Start fill:#4ade80
    style Complete fill:#22c55e
    style RunRace fill:#3b82f6
    style CalcFit fill:#f59e0b
    style Elite fill:#a855f7
    style Mutate fill:#ec4899
```

## Component Architecture

```mermaid
graph LR
    subgraph "Page Components"
        A[page.tsx<br/>Main Simulation]
        B[player/page.tsx<br/>Player Mode]
        C[optimize/page.tsx<br/>ML Optimizer]
    end
    
    subgraph "Control Components"
        D[ControlDeck<br/>- Agent config<br/>- Race settings<br/>- Real-time controls]
    end
    
    subgraph "Visualization Components"
        E[DataGrid<br/>- Live leaderboard<br/>- Positions<br/>- Lap times<br/>- DNF status]
        F[RaceVisualization<br/>- 2D SVG track<br/>- Vehicle positions<br/>- Real-time movement]
        G[Race3DVisualization<br/>- Three.js scene<br/>- 3D track<br/>- Camera controls]
        H[ParameterEvolutionChart<br/>- Fitness graph<br/>- Lap time graph<br/>- Statistics]
        I[RaceReport<br/>- Final results<br/>- Telemetry<br/>- Lap analysis]
    end
    
    A --> D
    A --> E
    A --> F
    A --> G
    A --> I
    
    B --> E
    B --> F
    B --> G
    
    C --> E
    C --> H
    
    style A fill:#4ade80
    style B fill:#fbbf24
    style C fill:#a855f7
```

## Physics Engine Data Flow

```mermaid
graph TD
    Start[Vehicle Physics Update] --> GetCurv[Get Track Curvature<br/>from current position]
    
    GetCurv --> CalcTarget[Calculate Target Speed<br/>- Base corner speed<br/>- Weather modifier<br/>- Tire grip]
    
    CalcTarget --> Accel{Current Speed<br/>< Target Speed?}
    
    Accel -->|Yes| ApplyAccel[Apply Acceleration<br/>- Engine power<br/>- Differential effect<br/>- Tire grip limit]
    Accel -->|No| ApplyBrake[Apply Braking<br/>- Brake balance<br/>- Engine braking<br/>- ABS simulation]
    
    ApplyAccel --> UpdateSpeed[Update Speed]
    ApplyBrake --> UpdateSpeed
    
    UpdateSpeed --> DRS{DRS Available<br/>& Activated?}
    
    DRS -->|Yes| AddDRS[+10% speed boost]
    DRS -->|No| Slipstream{In Slipstream?}
    
    AddDRS --> UpdatePos
    Slipstream -->|Yes| AddSlip[+5% speed boost]
    Slipstream -->|No| UpdatePos[Update Position<br/>position += speed * dt]
    
    AddSlip --> UpdatePos
    
    UpdatePos --> TireDeg[Update Tire Degradation<br/>- Wear from distance<br/>- Temp from speed<br/>- Compound effects]
    
    TireDeg --> Energy[Update Energy<br/>- Fuel consumption<br/>- ERS harvest/deploy<br/>- Battery level]
    
    Energy --> Damage[Update Damage<br/>- Random mechanical<br/>- Crash probability<br/>- Component wear]
    
    Damage --> CheckDNF{DNF Check<br/>Per-lap probability}
    
    CheckDNF -->|DNF| SetDNF[Mark as DNF<br/>finished = true<br/>Stop updates]
    CheckDNF -->|Continue| CheckLap{Crossed<br/>Start/Finish?}
    
    CheckLap -->|Yes| RecordLap[Record Lap<br/>- Lap time<br/>- Telemetry<br/>- Check pit stop]
    CheckLap -->|No| CheckPit{Pit Stop<br/>Requested?}
    
    RecordLap --> CheckPit
    
    CheckPit -->|Yes| ExecutePit[Execute Pit Stop<br/>- Change tires<br/>- Add fuel<br/>- Fix damage<br/>- 20-25s duration]
    CheckPit -->|No| End[End Physics Update]
    
    ExecutePit --> End
    SetDNF --> End
    
    style Start fill:#4ade80
    style UpdateSpeed fill:#3b82f6
    style CheckDNF fill:#ef4444
    style ExecutePit fill:#f59e0b
    style End fill:#22c55e
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Idle: Page Load
    
    Idle --> Configuring: User adjusts settings
    Configuring --> Idle: Settings saved
    
    Idle --> Starting: User clicks Start
    Starting --> Running: Simulation initialized
    
    Running --> Running: stepSimulation() loop
    
    state Running {
        [*] --> UpdatePhysics
        UpdatePhysics --> CheckEvents
        CheckEvents --> UpdateState
        UpdateState --> RenderUI
        RenderUI --> [*]
        
        note right of UpdatePhysics
            - Vehicle physics
            - Track position
            - Tire/fuel/energy
        end note
        
        note right of CheckEvents
            - Lap completion
            - Pit stops
            - DNF events
            - Safety car
        end note
    }
    
    Running --> Paused: User clicks Stop
    Paused --> Running: User clicks Resume
    Paused --> Idle: User clicks Reset
    
    Running --> Complete: All vehicles finished/DNF
    Complete --> ShowReport: Generate report
    ShowReport --> Idle: User clicks New Race
    
    state Optimizing {
        [*] --> InitPopulation
        InitPopulation --> EvaluateIndividual
        EvaluateIndividual --> RunTestRace
        RunTestRace --> CalculateFitness
        CalculateFitness --> NextIndividual
        NextIndividual --> EvaluateIndividual: More in generation
        NextIndividual --> EvolveGeneration: Generation complete
        EvolveGeneration --> EvaluateIndividual: More generations
        EvolveGeneration --> [*]: Max generations reached
    }
    
    Idle --> Optimizing: Start ML Optimization
    Optimizing --> Idle: Optimization complete
```

## Real-time Control System

```mermaid
graph TB
    subgraph "User Controls"
        UI[UI Sliders/Inputs]
    end
    
    subgraph "Hook Layer"
        UpdateFunc[Update Functions<br/>- updateVehicleMaxSpeed<br/>- updateVehicleDifferential<br/>- updateTrackTemperature<br/>- updateWeather<br/>etc.]
    end
    
    subgraph "Simulation Layer"
        SimRef[Simulation Ref]
        VehicleRef[Vehicle Ref]
        TrackRef[Track Ref]
    end
    
    subgraph "Live Effects"
        Physics[Physics Recalculation]
        Perf[Performance Impact]
        Visual[Visual Update]
    end
    
    UI -->|onChange event| UpdateFunc
    
    UpdateFunc -->|Direct property update| SimRef
    UpdateFunc -->|Direct property update| VehicleRef
    UpdateFunc -->|Direct property update| TrackRef
    
    SimRef --> Physics
    VehicleRef --> Physics
    TrackRef --> Physics
    
    Physics --> Perf
    Perf --> Visual
    
    Visual -->|State update| UI
    
    style UI fill:#4ade80
    style UpdateFunc fill:#3b82f6
    style Physics fill:#f59e0b
    style Visual fill:#a855f7
```

## Track System Architecture

```mermaid
graph TD
    subgraph "Track Data Sources"
        GeoFile[GeoJSON Files<br/>f1-circuits.geojson]
        CircuitMeta[Circuit Metadata<br/>names, locations, IDs]
    end
    
    subgraph "Track Class"
        Parser[fromGeoJSON<br/>Parse coordinates]
        Geometry[Track Geometry<br/>- Coordinates array<br/>- Total length<br/>- Segment lengths]
        Checkpoints[Checkpoint System<br/>- Start/finish line<br/>- Sector points<br/>- Distance markers]
        Distance[Distance Calculation<br/>- Point-to-track<br/>- Closest segment<br/>- Progress tracking]
    end
    
    subgraph "Track Features"
        Curvature[Curvature Calculation<br/>- Per segment<br/>- Affects target speed]
        Sectors[Sector Timing<br/>- Split times<br/>- Sector comparison]
        Surface[Surface Properties<br/>- Grip level<br/>- Weather effects]
    end
    
    GeoFile --> Parser
    CircuitMeta --> Parser
    
    Parser --> Geometry
    Geometry --> Checkpoints
    Geometry --> Distance
    
    Checkpoints --> Sectors
    Geometry --> Curvature
    Distance --> Surface
    
    Curvature -->|Input to| VehiclePhysics[Vehicle Physics]
    Sectors -->|Input to| Telemetry[Telemetry System]
    Surface -->|Input to| TireModel[Tire Model]
    
    style GeoFile fill:#4ade80
    style Parser fill:#3b82f6
    style VehiclePhysics fill:#f59e0b
```

## Vehicle Type System

```mermaid
classDiagram
    class VehicleConfig {
        +string id
        +string name
        +string vehicleType
        +number maxSpeed
        +number acceleration
        +number differential
        +number engineBraking
        +number brakeBalance
    }
    
    class RacingVehicle {
        +number mass = 798kg
        +number frontalArea = 1.4m²
        +number downforce = 3.5
        +updatePhysics()
        +calculateDrag()
        +calculateDownforce()
        +applyBraking()
    }
    
    class RacingBike {
        +number mass = 157kg
        +number frontalArea = 0.55m²
        +number downforce = 0.0
        +number leanAngle
        +updatePhysics()
        +calculateLeanDynamics()
        +lowerCenterOfGravity()
    }
    
    VehicleConfig <|-- RacingVehicle
    VehicleConfig <|-- RacingBike
    
    RacingVehicle : +number dragCoefficient
    RacingVehicle : +number wheelbase
    RacingVehicle : +boolean hasDRS
    
    RacingBike : +number gyroscopicEffect
    RacingBike : +number quickerAccel
    RacingBike : +boolean noDownforce
```

## File Structure

```
frontend/
├── app/
│   ├── page.tsx                    # Main simulation mode
│   ├── player/
│   │   └── page.tsx               # Player vs AI mode
│   ├── optimize/
│   │   └── page.tsx               # ML optimizer mode
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
│
├── components/
│   ├── ControlDeck.tsx            # Multi-agent control panel
│   ├── DataGrid.tsx               # Live leaderboard
│   ├── RaceVisualization.tsx      # 2D SVG visualization
│   ├── Race3DVisualization.tsx    # 3D Three.js scene
│   ├── ParameterEvolutionChart.tsx # ML progress charts
│   ├── RaceReport.tsx             # Post-race analysis
│   └── ConnectionStatus.tsx       # WebSocket status
│
├── lib/
│   ├── hooks/
│   │   ├── useRaceSimulation.ts   # Main simulation hook
│   │   ├── usePlayerRaceSimulation.ts # Player mode hook
│   │   └── useOptimization.ts     # ML optimization hook
│   │
│   ├── simulation/
│   │   └── RaceSimulation.ts      # Core race engine
│   │
│   ├── physics/
│   │   ├── RacingVehicle.ts       # Car physics & telemetry
│   │   └── RacingBike.ts          # Bike physics variant
│   │
│   ├── track/
│   │   └── Track.ts               # Track geometry & features
│   │
│   └── ml/
│       ├── GeneticOptimizer.ts    # Genetic algorithm
│       └── types.ts               # ML type definitions
│
└── public/
    └── data/
        └── circuits/
            ├── f1-circuits.json    # Circuit metadata
            └── f1-circuits.geojson # Track coordinates
```

## Technology Stack

```mermaid
graph LR
    subgraph "Frontend Framework"
        Next[Next.js 14<br/>App Router]
        React[React 18<br/>Hooks]
        TS[TypeScript 5<br/>Type Safety]
    end
    
    subgraph "Visualization"
        Three[Three.js<br/>3D Graphics]
        SVG[SVG<br/>2D Graphics]
        Chart[Custom Charts<br/>Performance graphs]
    end
    
    subgraph "Styling"
        Tailwind[Tailwind CSS<br/>Utility-first]
        Icons[Lucide Icons<br/>UI icons]
    end
    
    subgraph "Simulation Engine"
        Physics[Custom Physics<br/>Pure TypeScript]
        GA[Genetic Algorithm<br/>No dependencies]
        Math[Vector Math<br/>Position/distance calc]
    end
    
    subgraph "Data Format"
        JSON[JSON<br/>Circuit metadata]
        GeoJSON[GeoJSON<br/>Track coordinates]
    end
    
    Next --> React
    React --> TS
    
    Three --> SVG
    SVG --> Chart
    
    Physics --> Math
    GA --> Physics
    
    JSON --> GeoJSON
    
    style Next fill:#4ade80
    style React fill:#3b82f6
    style Three fill:#f59e0b
    style GA fill:#a855f7
```

## Key Design Patterns

### 1. **Hook-based State Management**
- Each mode has its own hook (`useRaceSimulation`, `usePlayerRaceSimulation`, `useOptimization`)
- Hooks encapsulate simulation logic and state
- Components remain presentational

### 2. **Ref-based Simulation Control**
- Simulation runs in refs to avoid re-renders
- `requestAnimationFrame` loop for smooth updates
- State updates at controlled intervals (10 FPS)

### 3. **Component Composition**
- Shared components (DataGrid, visualizations)
- Mode-specific controls (ControlDeck, ML charts)
- Modular architecture for easy extension

### 4. **Real-time Updates**
- Direct property mutations for live controls
- No state reconciliation needed
- Immediate physics response

### 5. **Genetic Algorithm**
- Pure TypeScript implementation
- Population-based evolution
- Tournament selection + crossover + mutation
- Fitness-based optimization
