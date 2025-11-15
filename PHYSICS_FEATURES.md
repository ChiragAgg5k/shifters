# 🏎️ Shifters Physics Engine

## Overview
Comprehensive racing physics simulation with real-world F1-inspired mechanics.

## Core Physics Systems

### 1. **Aerodynamics**
- **Drag Force**: `F_drag = 0.5 × ρ × Cd × A × v²`
  - Air density: 1.225 kg/m³
  - Drag coefficient (Cd): 0.7 (F1 typical)
  - Frontal area: 1.5 m²
  - Reduces top speed and acceleration at high speeds

- **Downforce**: `F_downforce = 0.5 × ρ × Cl × A × v²`
  - Downforce coefficient (Cl): 3.0
  - Increases cornering grip at high speeds
  - Speed-dependent: more effective above 70% max speed

- **DRS (Drag Reduction System)**
  - Reduces drag by 25% on straights
  - Auto-activates above 70% max speed on straight sections
  - Auto-deactivates in corners (curvature > 0)

- **Slipstreaming**
  - 30% drag reduction when within 50m of car ahead
  - Same lap requirement
  - Enables overtaking opportunities

### 2. **Tire Physics**

#### Tire Wear
- **Cornering wear**: Proportional to speed and corner radius
- **Braking wear**: Hard braking increases degradation
- **Performance impact**: >50% wear reduces cornering skill by up to 30%

#### Tire Temperature
- **Optimal range**: 80-100°C
- **Cold tires** (<60°C): 10% grip reduction
- **Overheated** (>110°C): 15% grip reduction
- **Heat generation**: Speed + cornering intensity
- **Cooling**: Natural cooling + weather effects (rain cools 2x faster)

### 3. **Vehicle Dynamics**

#### Mass & Acceleration
- **F1 car mass**: 798 kg (with driver)
- **Net acceleration**: `a_net = a_engine - (F_drag / mass)`
- **Braking**: `deceleration = brake_rate + drag_assistance`

#### Cornering
- **Base speed**: Track curvature determines recommended speed
- **Skill factor**: Driver skill (0.5-1.5x multiplier)
- **Downforce bonus**: Up to 30% faster through high-speed corners
- **Grip multiplier**: Weather × tire temp × tire wear × damage

### 4. **Weather Effects**

#### Track Conditions
- **Clear**: 100% grip
- **Wet**: 85% grip
- **Rain**: 70% grip
- **Temperature**: Affects tire heating/cooling rates

### 5. **Damage System**
- **Accumulation**: Random events during aggressive cornering
- **Performance impact**: Up to 30% reduction at 100% damage
- **Affects**: Cornering ability, acceleration
- **Repair**: Partial repair (50%) during pit stops

### 6. **Energy Management**
- **Consumption factors**:
  - Speed (proportional to velocity)
  - Acceleration (proportional to throttle changes)
  - Drag (proportional to aerodynamic resistance)
- **Range**: 0-100%
- **Pit stop**: Full recharge

### 7. **Track Geometry**
- **Real-world coordinates**: GeoJSON from actual F1 circuits
- **Elevation changes**: 3D positioning with altitude
- **Banking angles**: Affects cornering speeds
- **Curvature radius**: Determines corner difficulty

## Physics Constants

```python
# Aerodynamics
AIR_DENSITY = 1.225  # kg/m³
DRAG_COEFFICIENT = 0.7  # Cd
FRONTAL_AREA = 1.5  # m²
DOWNFORCE_COEFFICIENT = 3.0  # Cl

# Vehicle
MASS = 798.0  # kg (F1 with driver)
MAX_SPEED = 85-95  # m/s (306-342 km/h)
ACCELERATION = 12-15  # m/s²
BRAKING_RATE = 20-25  # m/s²

# Tires
OPTIMAL_TEMP_MIN = 80  # °C
OPTIMAL_TEMP_MAX = 100  # °C
WEAR_THRESHOLD = 50  # % before performance loss

# DRS & Slipstream
DRS_DRAG_REDUCTION = 0.25  # 25%
SLIPSTREAM_DRAG_REDUCTION = 0.30  # 30%
SLIPSTREAM_DISTANCE = 50.0  # meters
```

## Real-Time Telemetry

Each vehicle broadcasts:
- **Position**: 3D coordinates (x, y, z)
- **Speed**: Current velocity (m/s)
- **Energy**: Battery/fuel level (%)
- **Tire wear**: Degradation level (%)
- **Tire temperature**: Current temp (°C)
- **Damage level**: Structural damage (%)
- **DRS status**: Active/inactive
- **Slipstream**: In slipstream (yes/no)
- **Lap times**: Current and best lap
- **Overtakes**: Number of positions gained

## Strategy Elements

### Pit Stop Strategy
- **Duration**: 2.5 seconds
- **Benefits**:
  - Full energy recharge
  - Fresh tires (0% wear, 60°C)
  - 50% damage repair
  - Cornering skill reset
- **Cost**: Time penalty + cold tire disadvantage

### Overtaking Tactics
1. **Slipstream on straights** → DRS activation → overtake
2. **Late braking into corners** (tire temp dependent)
3. **Different racing lines** (track geometry)
4. **Tire advantage** (fresh vs worn)

## Performance Optimization

### Fastest Lap Strategy
- Maintain optimal tire temperature (80-100°C)
- Use DRS on all straights
- Minimize tire wear in early laps
- Time pit stops strategically
- Avoid damage accumulation

### Energy Conservation
- Lift and coast before corners
- Slipstream when possible (30% drag reduction)
- Smooth throttle inputs
- Optimal racing line (shortest distance)

## Comparison to Real F1

| Feature | Shifters | Real F1 |
|---------|----------|---------|
| Top Speed | 306-342 km/h | 330-360 km/h |
| 0-100 km/h | ~2.5s | ~2.6s |
| Downforce | 3.0 Cl | 3.0-4.0 Cl |
| DRS Advantage | 25% drag reduction | 20-25% |
| Tire Deg | Dynamic | Dynamic |
| Pit Stop | 2.5s | 2.0-2.5s |

## Future Enhancements

### Potential Additions
- [ ] Collision detection & avoidance
- [ ] Suspension dynamics (body roll, pitch)
- [ ] Brake temperature management
- [ ] Fuel load effects on handling
- [ ] Safety car periods
- [ ] Track evolution (rubber buildup)
- [ ] Multiple tire compounds (soft/medium/hard)
- [ ] ERS (Energy Recovery System)
- [ ] Team orders & strategy
- [ ] Qualifying mode (party mode)

---

**Built for competitive mobility simulation and AI racing strategy research.**
