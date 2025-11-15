# Advanced Physics Parameters - Control Panel Integration

## Summary

Added **Differential Preload**, **Engine Braking**, and **Brake Balance** controls to the frontend Control Panel with **3-tier configuration system**:
1. **Default values** (hardcoded)
2. **Global agent config** (applies to all agents)
3. **Per-agent config** (individual customization)

---

## Parameter Initialization Flow

### 1. **Default Values** (Hardcoded in useRaceSimulation.ts)

```typescript
// Line 121-123 in useRaceSimulation.ts
const differentialPreload = perAgentCfg?.differentialPreload ?? globalCfg?.differentialPreload ?? 50.0
const engineBraking = perAgentCfg?.engineBraking ?? globalCfg?.engineBraking ?? 0.5
const brakeBalance = perAgentCfg?.brakeBalance ?? globalCfg?.brakeBalance ?? 0.54
```

**Default Values:**
- `differentialPreload`: **50.0 Nm** (optimal for most conditions)
- `engineBraking`: **0.5** (50% - balanced)
- `brakeBalance`: **0.54** (54% front - optimal for F1)

These are used when **no customization is enabled**.

---

### 2. **Global Agent Config** (ControlDeck.tsx)

```typescript
// Line 33-35 in ControlDeck.tsx
const [agentDifferential, setAgentDifferential] = useState(50)
const [agentEngineBraking, setAgentEngineBraking] = useState(0.5)
const [agentBrakeBalance, setAgentBrakeBalance] = useState(0.54)
```

**UI Controls (when "Customize Agent Performance" is checked):**

```tsx
{/* Differential Preload */}
<input type="range" min="0" max="100" step="5" value={agentDifferential} />
Label: "Differential Preload: 50 Nm"
Range: 0 - 100 Nm (optimal: 50)

{/* Engine Braking */}
<input type="range" min="0" max="1" step="0.05" value={agentEngineBraking} />
Label: "Engine Braking: 50%"
Range: 0 - 100% (typical: 50%)

{/* Brake Balance */}
<input type="range" min="0.4" max="0.7" step="0.01" value={agentBrakeBalance} />
Label: "Brake Balance: 54% Front"
Range: 40 - 70% (optimal: 52-56%)
```

**Applied when:** `customizeAgents` checkbox is checked.  
**Effect:** All agents use these values.

---

### 3. **Per-Agent Config** (ControlDeck.tsx)

```typescript
// Line 39 in ControlDeck.tsx
const [perAgentConfigs, setPerAgentConfigs] = useState<Record<number, {
  maxSpeed: number
  acceleration: number
  dnfProbability: number
  differentialPreload?: number
  engineBraking?: number
  brakeBalance?: number
}>>({})
```

**UI Controls (when "Customize Each Agent Individually" is checked):**

For each agent (expandable panel):

```tsx
{/* Differential */}
<input type="range" min="0" max="100" step="5" 
  value={perAgentConfigs[i]?.differentialPreload ?? 50} />
Label: "Diff: 50 Nm"

{/* Engine Braking */}
<input type="range" min="0" max="1" step="0.05"
  value={perAgentConfigs[i]?.engineBraking ?? 0.5} />
Label: "EB: 50%"

{/* Brake Balance */}
<input type="range" min="0.4" max="0.7" step="0.01"
  value={perAgentConfigs[i]?.brakeBalance ?? 0.54} />
Label: "BB: 54%F"
```

**Applied when:** `perAgentCustomize` checkbox is checked.  
**Effect:** Each agent can have unique values (overrides global config).

---

## Priority Order (Highest to Lowest)

```
Per-Agent Config > Global Agent Config > Default Values
```

**Example for Agent #3:**
```typescript
// If per-agent has differentialPreload=60
differentialPreload = 60  ✅ (uses per-agent value)

// If per-agent doesn't have it, but global config has 45
differentialPreload = 45  ✅ (uses global value)

// If neither are set
differentialPreload = 50.0  ✅ (uses default)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ ControlDeck.tsx (UI Component)                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ STATE:                                                      │
│  • agentDifferential = 50                                   │
│  • agentEngineBraking = 0.5                                 │
│  • agentBrakeBalance = 0.54                                 │
│  • perAgentConfigs[i].differentialPreload = ...            │
│                                                             │
│ USER ADJUSTS SLIDERS ────────────────────┐                 │
│                                           │                 │
└───────────────────────────────────────────┼─────────────────┘
                                            │
                                            v
                    ┌──────────────────────────────────────┐
                    │ handleStartRace()                    │
                    │ Packages config into RaceConfig      │
                    └──────────────────┬───────────────────┘
                                       │
                                       v
┌─────────────────────────────────────────────────────────────┐
│ RaceConfig Interface                                        │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   agentConfig?: {                                           │
│     differentialPreload: 50,                                │
│     engineBraking: 0.5,                                     │
│     brakeBalance: 0.54                                      │
│   },                                                        │
│   perAgentConfig?: {                                        │
│     0: { differentialPreload: 60, ... },                    │
│     1: { engineBraking: 0.7, ... }                          │
│   }                                                         │
│ }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│ useRaceSimulation.ts (Hook)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ for each agent:                                             │
│   const differentialPreload =                               │
│     perAgentCfg?.differentialPreload ??                     │
│     globalCfg?.differentialPreload ??                       │
│     50.0                                                    │
│                                                             │
│   const vehicle = new RacingVehicle({                       │
│     differentialPreload,                                    │
│     engineBraking,                                          │
│     brakeBalance                                            │
│   })                                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│ RacingVehicle.ts (Physics Engine)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ constructor(config: VehicleConfig) {                        │
│   this.differentialPreload = config.differentialPreload     │
│                              ?? 50.0                        │
│   this.engineBraking = config.engineBraking ?? 0.5          │
│   this.brakeBalance = config.brakeBalance ?? 0.54           │
│ }                                                           │
│                                                             │
│ CALCULATIONS:                                               │
│  • calculateDifferentialEffect() uses differentialPreload   │
│  • calculateEngineBraking() uses engineBraking              │
│  • calculateBrakeDistribution() uses brakeBalance           │
└─────────────────────────────────────────────────────────────┘
```

---

## UI Screenshots (Text Description)

### Global Agent Customization

```
┌─────────────────────────────────────────────────────────────┐
│ [✓] Customize Agent Performance                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Max Speed: 90.0 m/s        Acceleration: 12.50 m/s²        │
│ ━━━━━━━━━━━━━━━━━━━━      ━━━━━━━━━━━━━━━━━━━━            │
│ 70 - 110 m/s               8 - 16 m/s²                     │
│                                                             │
│ DNF Probability: 2%                                         │
│ ━━━━━━━━━━━━━━━━━━━━                                      │
│ 0 - 10%                                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Differential Preload: 50 Nm  Engine Braking: 50%           │
│ ━━━━━━━━━━━━━━━━━━━━        ━━━━━━━━━━━━━━━━━━━━          │
│ 0 - 100 Nm (optimal: 50)     0 - 100% (typical: 50%)       │
│                                                             │
│ Brake Balance: 54% Front                                   │
│ ━━━━━━━━━━━━━━━━━━━━                                      │
│ 40 - 70% (optimal: 52-56%)                                 │
└─────────────────────────────────────────────────────────────┘
```

### Per-Agent Customization

```
┌─────────────────────────────────────────────────────────────┐
│ [✓] Customize Each Agent Individually                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Agent 1 ────────────────────────────── ✓ Configured ─┐  │
│ │                                                         │  │
│ │ Speed: 95.0 m/s   Accel: 13.00 m/s²   DNF: 1.0%       │  │
│ │ ━━━━━━━━━━━━      ━━━━━━━━━━━━        ━━━━━━━━━━━━   │  │
│ │                                                         │  │
│ │ Advanced Physics                                        │  │
│ │ Diff: 60 Nm       EB: 70%             BB: 56%F         │  │
│ │ ━━━━━━━━━━━━      ━━━━━━━━━━━━        ━━━━━━━━━━━━   │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─ Agent 2 ────────────────────────────── Default ──────┐  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─ Agent 3 ────────────────────────────── ✓ Configured ─┐  │
│ └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Example Scenarios

### Scenario 1: No Customization (Defaults)
```
✓ Global: OFF
✓ Per-Agent: OFF

Agent #1: diff=50, EB=0.5, BB=0.54 (defaults)
Agent #2: diff=50, EB=0.5, BB=0.54 (defaults)
Agent #3: diff=50, EB=0.5, BB=0.54 (defaults)
```

### Scenario 2: Global Customization
```
✓ Global: ON (diff=70, EB=0.7, BB=0.56)
✓ Per-Agent: OFF

Agent #1: diff=70, EB=0.7, BB=0.56 (global)
Agent #2: diff=70, EB=0.7, BB=0.56 (global)
Agent #3: diff=70, EB=0.7, BB=0.56 (global)
```

### Scenario 3: Mixed Customization
```
✓ Global: ON (diff=50, EB=0.5, BB=0.54)
✓ Per-Agent: ON
  - Agent #1: diff=60 (custom), EB & BB from global
  - Agent #2: No config (uses global)
  - Agent #3: diff=40, EB=0.3 (custom), BB from global

Agent #1: diff=60, EB=0.5, BB=0.54
Agent #2: diff=50, EB=0.5, BB=0.54
Agent #3: diff=40, EB=0.3, BB=0.54
```

---

## Parameter Ranges & Optimal Values

| Parameter            | Min | Default  | Max | Optimal Range | Unit         |
| -------------------- | --- | -------- | --- | ------------- | ------------ |
| Differential Preload | 0   | **50**   | 100 | 45-55         | Nm           |
| Engine Braking       | 0.0 | **0.5**  | 1.0 | 0.4-0.6       | 0-1          |
| Brake Balance        | 0.4 | **0.54** | 0.7 | 0.52-0.56     | 0-1 (front%) |

**Effects:**

**Differential Preload:**
- **Low (0-30 Nm):** More rotation, risk of wheelspin
- **Optimal (45-55 Nm):** Balanced traction & rotation
- **High (70-100 Nm):** Max traction, understeer

**Engine Braking:**
- **Low (0.0-0.3):** Coasts freely, more top speed
- **Optimal (0.4-0.6):** Balanced energy recovery
- **High (0.7-1.0):** Aggressive slowing, max regen

**Brake Balance:**
- **Rear bias (0.4-0.5):** Risk of rear lock-up, rotation on entry
- **Optimal (0.52-0.56):** Balanced, no lock-up
- **Front bias (0.6-0.7):** Risk of front lock-up, understeer

---

## How to Test

1. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Enable Global Customization:**
   - Check "Customize Agent Performance"
   - Adjust sliders for Differential, Engine Braking, Brake Balance
   - Start race

3. **Enable Per-Agent Customization:**
   - Check "Customize Each Agent Individually"
   - Expand agent panels
   - Adjust individual parameters
   - Start race

4. **Monitor Effects:**
   - Watch agent speeds in corners (differential effect)
   - Observe deceleration behavior (engine braking)
   - Check brake efficiency in DataGrid (brake balance)

---

## Files Modified

1. **`frontend/components/ControlDeck.tsx`**
   - Added state for 3 new parameters
   - Added UI sliders (global section)
   - Added per-agent controls (expandable panels)
   - Updated config packaging

2. **`frontend/lib/hooks/useRaceSimulation.ts`**
   - Updated `AgentConfig` interface
   - Added parameter extraction logic
   - Passes to `RacingVehicle` constructor

3. **`frontend/lib/physics/RacingVehicle.ts`**
   - Already has parameters in `VehicleConfig` interface
   - Constructor accepts and stores values
   - Physics calculations use these values

---

## Verification

Check that values flow through correctly:

```bash
cd frontend
npx tsx -e "
import { RacingVehicle } from './lib/physics/RacingVehicle'
const car = new RacingVehicle({
  id: 'test',
  name: 'Test',
  maxSpeed: 95,
  acceleration: 12,
  differentialPreload: 70,
  engineBraking: 0.7,
  brakeBalance: 0.56
})
console.log('Diff:', car.differentialPreload)
console.log('EB:', car.engineBraking)
console.log('BB:', car.brakeBalance)
"
```

Expected output:
```
Diff: 70
EB: 0.7
BB: 0.56
```

---

## Summary

✅ **Parameters added to UI** (ControlDeck.tsx)  
✅ **Global & per-agent config supported**  
✅ **Priority system: Per-Agent > Global > Default**  
✅ **Proper ranges & defaults**  
✅ **Full integration with physics engine**  

**Default initialization:**
- Differential: 50 Nm
- Engine Braking: 0.5 (50%)
- Brake Balance: 0.54 (54% front)

**User can override via:**
- Global checkbox → affects all agents
- Per-agent checkbox → individual customization
