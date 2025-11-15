# Frontend Physics Quick Reference

## Vehicle Configuration

```typescript
const vehicle = new RacingVehicle({
  id: 'v1',
  name: 'Car Name',
  maxSpeed: 95,              // m/s (F1: 85-95)
  acceleration: 12,          // m/s² (F1: 10-14)
  
  // Advanced Physics (Optional)
  differentialPreload: 50,   // Nm (0-100, optimal: 45-55)
  engineBraking: 0.5,        // 0-1 (0=min, 1=max, typical: 0.4-0.6)
  brakeBalance: 0.54         // 0-1 (front bias, optimal: 0.52-0.56)
})
```

## Physics Constants

```typescript
// Vehicle Geometry
wheelbase: 3.6 m           // Front to rear axle distance
cgHeight: 0.35 m           // Center of gravity height
trackWidth: 2.0 m          // Left to right wheel distance
frontWeightDist: 0.46      // 46% front, 54% rear

// Physics
mass: 798 kg               // F1 minimum weight
Cd: 0.7                    // Drag coefficient
Cl: 3.0                    // Downforce coefficient
A: 1.5 m²                  // Frontal area
μ: 1.8                     // Tire friction coefficient
```

## Key Formulas

### Cornering Speed
```typescript
// Downforce
F_down = 0.5 * ρ * Cl * A * v²  // ~17640 N at 80 m/s

// Normal force
N = m*g + F_down

// Load-sensitive tire grip
excessLoad = (N/4 - nominal) / 1000
tireFactor = 1.0 - (excessLoad * 0.03)  // -3% per 1000N
μ_eff = μ * tireFactor

// Max cornering speed
v_max = √((μ_eff * N * r) / m)
```

### Load Transfer
```typescript
// Longitudinal (accel/brake)
ΔF_long = (m * a_x * h) / L    // ~382 N at 5 m/s²

// Lateral (cornering)
ΔF_lat = (m * a_y * h) / (w/2) // ~1378 N at 50 m/s²

// 4-wheel distribution
FL = F_front/2 - ΔF_long/2 - ΔF_lat/2
FR = F_front/2 - ΔF_long/2 + ΔF_lat/2
RL = F_rear/2 + ΔF_long/2 - ΔF_lat/2
RR = F_rear/2 + ΔF_long/2 + ΔF_lat/2
```

### Differential
```typescript
// Traction factor based on wheel speed difference
if (speedDiff < 5 m/s):
  traction = 1.0 + (preload / 1000)      // Straight: ~1.05
else:
  deviation = |preload - 50|
  traction = 1.0 + ((100 - deviation) / 1000)  // Corner: ~1.10
```

### Engine Braking
```typescript
rpmFactor = speed / maxSpeed
decel = -2.5 * rpmFactor * engineBraking  // m/s²
// Example: -0.79 m/s² at 60 m/s, 50% setting
```

### Brake Balance
```typescript
F_front = totalBrake * brakeBalance
F_rear = totalBrake * (1 - brakeBalance)

// Lock-up check
maxFront = μ * (FL + FR) * 0.95
maxRear = μ * (RL + RR) * 0.95
locked = (F_brake > maxBrake)

// Penalty if locked
efficiency = locked ? 0.6 : 1.0
```

## State Vector (13 dims)

```typescript
const state = vehicle.getRLStateVector()
// [0] speed (m/s)
// [1] curvature (1/m)
// [2] distance_to_corner (m) - not implemented
// [3] tire_temperature (°C)
// [4] energy (%)
// [5] differential_preload (Nm)
// [6] engine_braking (0-1)
// [7] brake_balance (0-1)
// [8] front_load (N)
// [9] rear_load (N)
// [10] lateral_load (N)
// [11] traction_factor (0-1.15)
// [12] downforce_level (N)
```

## Reward Function

```typescript
const reward = vehicle.getRLReward()

// Components:
// lap_time: -10 to +10 (not implemented yet)
// efficiency: -5 to +2 (energy + tires + brakes)
// consistency: 0 to +1 (smooth braking)
// safety: 0 to +1 (no damage)

// Total: -15 to +14
```

## Actions (RL Training)

```typescript
// Adjust differential preload
vehicle.adjustDifferential(+5.0)  // +5 Nm
// Range: 0-100 Nm, clamped

// Adjust engine braking
vehicle.adjustEngineBraking(-0.1)  // -10%
// Range: 0-1, clamped

// Adjust brake balance
vehicle.adjustBrakeBalance(+0.02)  // +2% front
// Range: 0-1, clamped
```

## Typical Values

| Parameter     | Low    | Optimal | High   |
| ------------- | ------ | ------- | ------ |
| Speed         | 30 m/s | 80 m/s  | 95 m/s |
| Downforce     | 2.5 kN | 18 kN   | 25 kN  |
| Front Load    | 3 kN   | 3.6 kN  | 5 kN   |
| Rear Load     | 2.5 kN | 4.2 kN  | 6 kN   |
| Traction      | 0.90   | 1.05    | 1.15   |
| Brake Eff     | 60%    | 95%     | 100%   |
| Diff Preload  | 30 Nm  | 50 Nm   | 70 Nm  |
| Engine Brake  | 0.3    | 0.5     | 0.7    |
| Brake Balance | 0.50   | 0.54    | 0.58   |

## Performance Characteristics

```typescript
// Straight line (curvature = 0)
- Target speed: ~92 m/s
- Downforce: ~17600 N
- Traction: ~1.05

// Medium corner (curvature = 0.02, r=50m)
- Target speed: ~44 m/s
- Downforce: ~6900 N
- Lateral accel: ~39 m/s²
- Load transfer: ~1400 N per side

// Tight corner (curvature = 0.05, r=20m)
- Target speed: ~28 m/s
- Downforce: ~2700 N
- Lateral accel: ~39 m/s²
- Load transfer: ~1400 N per side

// Braking (15 m/s²)
- Front load: +4800 N
- Rear load: -2200 N
- Risk of rear lock-up if balance > 0.56
```

## Common Issues & Solutions

### Issue: Cornering too slow
**Check:** Tire temperature (optimal: 85-95°C)
**Fix:** Warm up tires, adjust cornering skill

### Issue: Rear lock-up under braking
**Check:** Brake balance (should be 0.52-0.56)
**Fix:** Reduce brake balance (move forward)

### Issue: Understeer in corners
**Check:** Differential preload (should be ~50 Nm)
**Fix:** Reduce preload for rotation

### Issue: Wheelspin on exit
**Check:** Differential preload (should be ~50 Nm)
**Fix:** Increase preload for traction

### Issue: Low brake efficiency
**Check:** Locked wheels, load transfer
**Fix:** Adjust brake balance, brake earlier

## Testing Checklist

```typescript
✅ Straight line: targetSpeed ≈ maxSpeed
✅ Corner: targetSpeed < straight speed
✅ Downforce: increases with speed (v²)
✅ Load transfer: 4 wheels sum to total weight
✅ Differential: traction > 1.0 in corners
✅ Engine braking: negative decel when coasting
✅ Brake balance: distributes force front/rear
✅ Lock-up: reduces efficiency to 60%
✅ State vector: 13 dimensions
✅ Reward: -15 to +14 range
✅ Adjustments: clamped to valid ranges
```

## Code Example

```typescript
import { RacingVehicle } from '@/lib/physics/RacingVehicle'

const car = new RacingVehicle({
  id: 'p1',
  name: 'Hamilton',
  maxSpeed: 95,
  acceleration: 13,
  differentialPreload: 52,
  engineBraking: 0.55,
  brakeBalance: 0.54
})

// Simulation loop (10 Hz)
setInterval(() => {
  // 1. Get track curvature at current position
  const curvature = track.getCurvature(car.position)
  
  // 2. Calculate target speed
  car.calculateTargetSpeed(curvature, 'clear', 45)
  
  // 3. Move vehicle
  car.move(0.1, track.length)
  
  // 4. Get RL state
  const state = car.getRLStateVector()
  
  // 5. Get reward
  const reward = car.getRLReward()
  
  // 6. Apply RL actions (optional)
  if (needsAdjustment) {
    car.adjustDifferential(action[0])
    car.adjustEngineBraking(action[1])
    car.adjustBrakeBalance(action[2])
  }
  
  // 7. Log telemetry
  console.log({
    speed: car.speed.toFixed(1),
    frontLoad: car.frontLoad.toFixed(0),
    rearLoad: car.rearLoad.toFixed(0),
    traction: car.tractionFactor.toFixed(3),
    brakeEff: (car.brakeEfficiency * 100).toFixed(1)
  })
}, 100)
```

---

**Quick Tip:** Start with default parameters (diff=50, EB=0.5, BB=0.54) and let RL training optimize from there!
