"""
Quick test to verify web visualization works with new physics.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from shifters.simcore.simulator import MobilitySimulation
from shifters.agents.base_agent import RacingVehicle
from shifters.racing import TireCompound
from shifters.environment.geojson_parser import GeoJSONTrackParser


def test_simulation_with_physics():
    """Test that simulation runs with all physics features enabled."""
    print("\n" + "="*60)
    print("TESTING SIMULATION WITH F1METRICS PHYSICS")
    print("="*60)
    
    # Create Monaco track
    print("\n1. Loading Monaco circuit...")
    from pathlib import Path
    circuits_file = Path(__file__).parent.parent / "data" / "circuits" / "f1-circuits.geojson"
    
    track = GeoJSONTrackParser.from_feature_collection_file(
        str(circuits_file),
        circuit_id="mc-1929",  # Monaco
        num_laps=10
    )
    print(f"   ✓ Track loaded: {track.name}")
    print(f"   ✓ Length: {track.length:.0f}m")
    print(f"   ✓ Laps: {track.num_laps}")
    
    # Create simulation
    print("\n2. Creating simulation...")
    sim = MobilitySimulation(track=track)
    print(f"   ✓ Simulation created")
    
    # Add racing vehicles with physics
    print("\n3. Adding racing vehicles with F1Metrics physics...")
    
    vehicles = []
    compounds = [TireCompound.SOFT, TireCompound.MEDIUM, TireCompound.HARD]
    consistencies = [0.95, 0.85, 0.75]
    
    for i in range(3):
        vehicle = RacingVehicle(
            model=sim,
            unique_id=f"car_{i+1}",
            name=f"Driver {i+1}",
            max_speed=80.0,
            starting_compound=compounds[i],
            enable_tire_management=True,
            consistency=consistencies[i],
            pit_stops_planned=1,
            track_name="monaco",
        )
        vehicles.append(vehicle)
        sim.agent_set.add(vehicle)
        print(f"   ✓ {vehicle.name}: {compounds[i].value} tires, consistency={consistencies[i]}")
    
    # Run simulation
    print("\n4. Running simulation for 50 steps...")
    for step in range(50):
        sim.step()
        if (step + 1) % 10 == 0:
            print(f"   Step {step + 1}: ", end="")
            for v in vehicles:
                print(f"{v.name}(L{v.lap}, {v.current_tires.wear_percentage:.1f}% wear) ", end="")
            print()
    
    # Check results
    print("\n5. Validation:")
    all_ok = True
    
    for v in vehicles:
        print(f"\n   {v.name}:")
        print(f"     Laps: {v.lap}")
        print(f"     Tire wear: {v.tire_wear:.1f}%")
        print(f"     Fuel: {v.fuel_mass:.1f}kg")
        print(f"     Energy: {v.energy:.1f}%")
        print(f"     Fuel effect: {v.calculate_fuel_effect():.3f}s")
        
        if v.drs_system:
            print(f"     DRS system: ✓")
        else:
            print(f"     DRS system: ✗ MISSING")
            all_ok = False
            
        if v.overtaking_model:
            print(f"     Overtaking model: ✓")
        else:
            print(f"     Overtaking model: ✗ MISSING")
            all_ok = False
        
        if v.current_tires:
            print(f"     Tire compound: {v.current_tires.compound.value}")
        else:
            print(f"     Tires: ✗ MISSING")
            all_ok = False
    
    print("\n" + "="*60)
    if all_ok:
        print("✅ ALL TESTS PASSED - Physics working correctly!")
    else:
        print("❌ SOME TESTS FAILED - Check output above")
    print("="*60)
    
    return all_ok


if __name__ == "__main__":
    success = test_simulation_with_physics()
    sys.exit(0 if success else 1)
