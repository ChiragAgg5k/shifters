"""
Test OpenF1 API integration for pit stop strategies.

Demonstrates how real F1 stint data is used to create realistic pit strategies.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from shifters.racing import TireCompound
from shifters.racing.pit_stop import PitStopStrategy, get_openf1_strategy_data


def test_openf1_strategy_data():
    """Test fetching and analyzing OpenF1 strategy data."""
    print("\n" + "="*70)
    print("TESTING OPENF1 API INTEGRATION FOR PIT STRATEGIES")
    print("="*70)
    
    # Test circuits
    test_circuits = ["monaco", "monza", "silverstone", "spa-francorchamps"]
    
    for circuit in test_circuits:
        print(f"\n📍 {circuit.upper()}")
        print("-" * 70)
        
        data = get_openf1_strategy_data(circuit)
        
        if data and "error" not in data:
            print(f"✅ OpenF1 data retrieved successfully!")
            print(f"\n   Session: {data.get('year')} (Session key: {data.get('session_key')})")
            print(f"   Sample size: {data.get('sample_size')} stints from {data.get('total_drivers')} drivers")
            print(f"   Most common stops: {data.get('most_common_stops')}")
            
            print(f"\n   Compound usage:")
            for compound, count in data.get('compound_usage', {}).items():
                print(f"     {compound}: {count} stints")
            
            print(f"\n   Average stint lengths:")
            for compound, avg_laps in data.get('average_stint_lengths', {}).items():
                print(f"     {compound}: {avg_laps:.1f} laps")
        else:
            error = data.get("error") if data else "No data available"
            print(f"❌ Could not fetch data: {error}")


def test_strategy_generation():
    """Test pit strategy generation with OpenF1 data."""
    print("\n" + "="*70)
    print("TESTING STRATEGY GENERATION WITH OPENF1 DATA")
    print("="*70)
    
    # Monaco GP 2025 - 78 laps
    print(f"\n🏎️  MONACO GRAND PRIX SIMULATION (78 laps)")
    print("-" * 70)
    
    strategy_monaco = PitStopStrategy(
        total_laps=78,
        track_length=3337,
        pit_lane_time_loss=20.0,
        circuit_name="monaco"
    )
    
    # Generate strategies for 3 different cars
    print("\n1-Stop Strategies (based on real Monaco data):")
    for i in range(3):
        strategy_monaco.plan_strategy(TireCompound.MEDIUM, target_stops=1, seed_offset=i*100)
        print(f"\n   Car #{i+1}:")
        for lap, compound in strategy_monaco.planned_stops:
            print(f"     Lap {lap}: Switch to {compound.value}")
    
    # Monza GP 2025 - 53 laps
    print(f"\n\n🏎️  ITALIAN GRAND PRIX SIMULATION (53 laps)")
    print("-" * 70)
    
    strategy_monza = PitStopStrategy(
        total_laps=53,
        track_length=5793,
        pit_lane_time_loss=18.0,
        circuit_name="monza"
    )
    
    # Generate 2-stop strategies
    print("\n2-Stop Strategies (based on real Monza data):")
    for i in range(3):
        strategy_monza.plan_strategy(TireCompound.SOFT, target_stops=2, seed_offset=i*150)
        print(f"\n   Car #{i+1}:")
        for lap, compound in strategy_monza.planned_stops:
            print(f"     Lap {lap}: Switch to {compound.value}")


def test_fallback_strategy():
    """Test fallback strategy when OpenF1 data is unavailable."""
    print("\n" + "="*70)
    print("TESTING FALLBACK STRATEGY (No OpenF1 Data)")
    print("="*70)
    
    print(f"\n🏎️  CUSTOM CIRCUIT (50 laps, no OpenF1 data)")
    print("-" * 70)
    
    strategy = PitStopStrategy(
        total_laps=50,
        track_length=5000,
        pit_lane_time_loss=20.0,
        circuit_name=None  # No circuit name = no OpenF1 data
    )
    
    print("\n1-Stop Strategy (fallback algorithm):")
    for i in range(3):
        strategy.plan_strategy(TireCompound.MEDIUM, target_stops=1, seed_offset=i*100)
        print(f"\n   Car #{i+1}:")
        for lap, compound in strategy.planned_stops:
            print(f"     Lap {lap}: Switch to {compound.value}")


def compare_strategies():
    """Compare OpenF1-based vs fallback strategies."""
    print("\n" + "="*70)
    print("COMPARISON: OpenF1 vs Fallback Strategies")
    print("="*70)
    
    circuit = "silverstone"
    laps = 52
    
    # With OpenF1
    strategy_openf1 = PitStopStrategy(
        total_laps=laps,
        track_length=5891,
        pit_lane_time_loss=20.0,
        circuit_name=circuit
    )
    strategy_openf1.plan_strategy(TireCompound.MEDIUM, target_stops=1, seed_offset=100)
    
    # Without OpenF1 (fallback)
    strategy_fallback = PitStopStrategy(
        total_laps=laps,
        track_length=5891,
        pit_lane_time_loss=20.0,
        circuit_name=None
    )
    strategy_fallback.plan_strategy(TireCompound.MEDIUM, target_stops=1, seed_offset=100)
    
    print(f"\n📊 Silverstone 1-Stop Strategy Comparison ({laps} laps)")
    print("-" * 70)
    
    print("\nWith OpenF1 historical data:")
    if strategy_openf1.planned_stops:
        for lap, compound in strategy_openf1.planned_stops:
            print(f"  Lap {lap}: {compound.value}")
    else:
        print("  No stops planned")
    
    print("\nFallback algorithm (no real data):")
    if strategy_fallback.planned_stops:
        for lap, compound in strategy_fallback.planned_stops:
            print(f"  Lap {lap}: {compound.value}")
    else:
        print("  No stops planned")
    
    if strategy_openf1.openf1_data:
        print(f"\n✅ OpenF1 data: Using real average stint lengths")
        for compound, laps in strategy_openf1.openf1_data.get('average_stint_lengths', {}).items():
            print(f"   {compound}: {laps:.1f} laps average")
    else:
        print(f"\n⚠️  No OpenF1 data available - using estimation")


if __name__ == "__main__":
    print("\n" + "="*70)
    print("🏁 OPENF1 PIT STRATEGY INTEGRATION TEST SUITE")
    print("="*70)
    print("\nThis test demonstrates how real F1 stint data from OpenF1 API")
    print("is used to create realistic, data-driven pit stop strategies.")
    
    test_openf1_strategy_data()
    test_strategy_generation()
    test_fallback_strategy()
    compare_strategies()
    
    print("\n" + "="*70)
    print("✅ TEST SUITE COMPLETE")
    print("="*70)
    print("\nKey improvements:")
    print("  • Pit strategies based on real F1 historical stint data")
    print("  • Average stint lengths per compound from actual races")
    print("  • Agent-specific variation for realistic strategy diversity")
    print("  • Fallback algorithm when OpenF1 data unavailable")
    print("  • Cached data to minimize API calls")
