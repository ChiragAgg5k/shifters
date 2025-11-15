"""
F1Metrics Physics Validation Script

Tests the physics improvements against F1Metrics mathematical model:
1. Quadratic tire degradation
2. Fuel weight effect
3. Driver lap-time variability
"""

import sys
from pathlib import Path
import random

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from shifters.racing import TireSet, TireCompound
from shifters.agents.base_agent import RacingVehicle
from mesa import Model


class MockEnvironment:
    """Mock environment for testing."""
    def __init__(self):
        self.is_wet = False
        self.temperature = 25.0
        self.track = MockTrack()


class MockTrack:
    """Mock track for testing."""
    def __init__(self):
        self.length = 5000.0  # 5km track
        self.num_laps = 50


class MockModel(Model):
    """Mock model for testing."""
    def __init__(self):
        super().__init__()
        self.time_step = 0.1
        self.environment = MockEnvironment()


def test_quadratic_degradation():
    """Test that tire degradation accelerates quadratically."""
    print("\n" + "="*60)
    print("TEST 1: Quadratic Tire Degradation")
    print("="*60)
    print("\nF1Metrics Model: Degradation rate should INCREASE as tires age")
    print("Expected: Later laps show higher wear rate than early laps\n")
    
    tire = TireSet(TireCompound.SOFT)
    
    degradation_samples = []
    laps = [0, 5, 10, 15, 20]  # Sample at different tire ages
    
    for target_lap in laps:
        # Reset tire to specific age
        test_tire = TireSet(TireCompound.SOFT)
        test_tire.laps_used = target_lap
        test_tire.wear_percentage = 0.0  # Reset for clean measurement
        
        # Measure degradation for one lap at 250 km/h
        initial_wear = test_tire.wear_percentage
        deg = test_tire._calculate_degradation(speed=250.0, is_wet=False)
        degradation_samples.append((target_lap, deg))
        
        print(f"Lap {target_lap:2d}: Degradation rate = {deg:.4f}%/lap")
    
    # Verify quadratic increase
    print("\nVerification:")
    for i in range(1, len(degradation_samples)):
        prev_lap, prev_deg = degradation_samples[i-1]
        curr_lap, curr_deg = degradation_samples[i]
        increase = ((curr_deg - prev_deg) / prev_deg) * 100
        print(f"  Laps {prev_lap}→{curr_lap}: +{increase:.1f}% increase in deg rate")
    
    # Check if quadratic (rate increases over time)
    rates_increasing = all(
        degradation_samples[i][1] > degradation_samples[i-1][1]
        for i in range(1, len(degradation_samples))
    )
    
    if rates_increasing:
        print("\n✅ PASS: Degradation rate increases quadratically with tire age")
    else:
        print("\n❌ FAIL: Degradation rate is not increasing")


def test_fuel_effect():
    """Test fuel weight effect on lap times."""
    print("\n" + "="*60)
    print("TEST 2: Fuel Weight Effect")
    print("="*60)
    print("\nF1Metrics Model: 0.037 seconds per lap of fuel")
    print("Expected: Car gets faster as fuel burns (lighter weight)\n")
    
    model = MockModel()
    car = RacingVehicle(
        model=model,
        unique_id="test_car",
        name="Test Car",
        enable_tire_management=True
    )
    
    print(f"Starting fuel mass: {car.fuel_mass:.1f} kg")
    print(f"Fuel consumption: {car.fuel_consumption_rate:.1f} kg/lap")
    print(f"Fuel effect factor: {car.fuel_effect_per_lap:.3f} s/lap\n")
    
    samples = []
    for lap in [0, 10, 20, 30, 40, 50]:
        # Set fuel for this lap
        car.fuel_mass = 110.0 - (lap * car.fuel_consumption_rate)
        fuel_penalty = car.calculate_fuel_effect()
        samples.append((lap, car.fuel_mass, fuel_penalty))
        print(f"Lap {lap:2d}: Fuel = {car.fuel_mass:5.1f} kg → Time penalty = {fuel_penalty:.3f}s")
    
    print("\nVerification:")
    for i in range(1, len(samples)):
        prev_lap, prev_fuel, prev_penalty = samples[i-1]
        curr_lap, curr_fuel, curr_penalty = samples[i]
        time_gained = prev_penalty - curr_penalty
        print(f"  Laps {prev_lap}→{curr_lap}: Lost {prev_fuel-curr_fuel:.1f}kg fuel → Gained {time_gained:.3f}s/lap")
    
    # Verify fuel effect decreases over race
    penalties_decreasing = all(
        samples[i][2] < samples[i-1][2]
        for i in range(1, len(samples))
    )
    
    if penalties_decreasing:
        print("\n✅ PASS: Fuel weight penalty decreases as fuel burns")
    else:
        print("\n❌ FAIL: Fuel effect not working correctly")


def test_driver_variability():
    """Test lap-to-lap variability based on driver consistency."""
    print("\n" + "="*60)
    print("TEST 3: Driver Lap-Time Variability")
    print("="*60)
    print("\nF1Metrics Model: Normal distribution with σ = 0.2s to 0.7s")
    print("Expected: Consistent drivers (high consistency) have lower σ\n")
    
    model = MockModel()
    
    # Test two drivers with different consistency
    consistent_driver = RacingVehicle(
        model=model,
        unique_id="consistent",
        name="Consistent Driver",
        consistency=1.0,  # Very consistent
        enable_tire_management=True
    )
    
    inconsistent_driver = RacingVehicle(
        model=model,
        unique_id="inconsistent",
        name="Inconsistent Driver",
        consistency=0.3,  # Inconsistent
        enable_tire_management=True
    )
    
    # Sample lap time variations
    n_laps = 100
    
    print("Sampling 100 laps for each driver:\n")
    
    consistent_variations = [consistent_driver.get_lap_time_variation() for _ in range(n_laps)]
    inconsistent_variations = [inconsistent_driver.get_lap_time_variation() for _ in range(n_laps)]
    
    # Calculate standard deviations
    import statistics
    consistent_std = statistics.stdev(consistent_variations)
    inconsistent_std = statistics.stdev(inconsistent_variations)
    
    print(f"Consistent Driver (consistency={consistent_driver.consistency:.1f}):")
    print(f"  Expected σ: ~0.2s")
    print(f"  Actual σ:   {consistent_std:.3f}s")
    print(f"  Range: [{min(consistent_variations):.3f}s, {max(consistent_variations):.3f}s]")
    
    print(f"\nInconsistent Driver (consistency={inconsistent_driver.consistency:.1f}):")
    print(f"  Expected σ: ~0.55s")
    print(f"  Actual σ:   {inconsistent_std:.3f}s")
    print(f"  Range: [{min(inconsistent_variations):.3f}s, {max(inconsistent_variations):.3f}s]")
    
    # Verify
    consistent_in_range = 0.15 <= consistent_std <= 0.25
    inconsistent_in_range = 0.45 <= inconsistent_std <= 0.65
    more_variable = inconsistent_std > consistent_std
    
    print("\nVerification:")
    print(f"  Consistent driver σ in expected range (0.15-0.25s): {consistent_in_range}")
    print(f"  Inconsistent driver σ in expected range (0.45-0.65s): {inconsistent_in_range}")
    print(f"  Inconsistent driver more variable: {more_variable}")
    
    if consistent_in_range and inconsistent_in_range and more_variable:
        print("\n✅ PASS: Lap-time variability working correctly")
    else:
        print("\n❌ FAIL: Lap-time variability not matching F1Metrics model")


def test_combined_effects():
    """Test all physics effects combined over a race stint."""
    print("\n" + "="*60)
    print("TEST 4: Combined Physics Effects (Race Simulation)")
    print("="*60)
    print("\nSimulating 20-lap stint with SOFT tires")
    print("Expected: Lap times degrade quadratically + fuel effect improves linearly + random variation\n")
    
    model = MockModel()
    car = RacingVehicle(
        model=model,
        unique_id="racer",
        name="Test Racer",
        consistency=0.85,
        starting_compound=TireCompound.SOFT,
        enable_tire_management=True
    )
    
    base_lap_time = 90.0  # 1:30.000 base time
    
    print(f"Base lap time: {base_lap_time:.3f}s")
    print(f"Driver consistency: {car.consistency:.2f}\n")
    print("Lap | Tire Age | Tire Deg | Fuel Pen | Random  | Total Time")
    print("-" * 65)
    
    lap_times = []
    
    for lap in range(20):
        # Tire degradation effect (gets worse quadratically)
        if car.current_tires:
            tire_grip = car.current_tires.get_grip_level(is_wet=False)
            # Lost grip translates to slower lap (roughly 0.5s per 10% grip loss)
            tire_penalty = (1.0 - tire_grip) * 5.0
        else:
            tire_penalty = 0.0
        
        # Fuel effect (gets better linearly)
        fuel_penalty = car.calculate_fuel_effect()
        
        # Random variation
        random_variation = car.get_lap_time_variation()
        
        # Total lap time
        lap_time = base_lap_time + tire_penalty + fuel_penalty + random_variation
        lap_times.append(lap_time)
        
        print(f"{lap:3d} | {car.current_tires.laps_used if car.current_tires else 0:8d} | "
              f"{tire_penalty:8.3f} | {fuel_penalty:8.3f} | {random_variation:+7.3f} | {lap_time:10.3f}")
        
        # Simulate tire wear and fuel consumption for one lap
        if car.current_tires:
            car.current_tires.update(
                lap_distance=model.environment.track.length,
                track_length=model.environment.track.length,
                speed=250.0,
                ambient_temp=25.0,
                is_wet=False
            )
        car.consume_fuel(1.0)
    
    print("\nAnalysis:")
    print(f"  First lap: {lap_times[0]:.3f}s")
    print(f"  Last lap:  {lap_times[-1]:.3f}s")
    print(f"  Difference: {lap_times[-1] - lap_times[0]:.3f}s")
    
    # Trend should show degradation outpacing fuel improvement
    trend_upward = lap_times[-1] > lap_times[0]
    
    if trend_upward:
        print("\n✅ PASS: Tire degradation outpaces fuel improvement (realistic)")
    else:
        print("\n⚠️  WARNING: Lap times improved over stint (unusual)")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("F1METRICS PHYSICS VALIDATION SUITE")
    print("="*60)
    print("\nTesting implementation of F1Metrics mathematical models:")
    print("  - Quadratic tire degradation")
    print("  - Fuel weight effect (0.037s/lap)")
    print("  - Driver lap-time variability (σ = 0.2-0.7s)")
    
    # Run all tests
    test_quadratic_degradation()
    test_fuel_effect()
    test_driver_variability()
    test_combined_effects()
    
    print("\n" + "="*60)
    print("VALIDATION COMPLETE")
    print("="*60)
    print("\nNext steps:")
    print("  - Implement DRS and overtaking mechanics")
    print("  - Add track-specific parameters")
    print("  - Improve pit stop duration distribution")
    print("  - Add undercut/overcut strategy modeling")
