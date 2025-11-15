"""Pit stop mechanics and strategy for F1 racing simulation."""

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Tuple, Dict, Any
import random
from shifters.racing.tire_model import TireCompound, TireSet

# Mapping from our circuit names to OpenF1 circuit_short_name values
CIRCUIT_NAME_MAPPING = {
    # Our circuit ID -> OpenF1 circuit_short_name
    "monaco": "Monte Carlo",
    "monza": "Monza",
    "silverstone": "Silverstone",
    "spa-francorchamps": "Spa-Francorchamps",
    "suzuka": "Suzuka",
    "interlagos": "Interlagos",
    "bahrain": "Sakhir",
    "jeddah": "Jeddah",
    "australia": "Melbourne",
    "china": "Shanghai",
    "miami": "Miami",
    "imola": "Imola",
    "canada": "Montreal",
    "spain": "Catalunya",
    "austria": "Spielberg",
    "britain": "Silverstone",
    "hungary": "Hungaroring",
    "netherlands": "Zandvoort",
    "italy": "Monza",
    "singapore": "Singapore",
    "japan": "Suzuka",
    "qatar": "Lusail",
    "usa": "Austin",
    "mexico": "Mexico City",
    "brazil": "Interlagos",
    "vegas": "Las Vegas",
    "abu-dhabi": "Yas Marina Circuit",
    "azerbaijan": "Baku",
}

# Cache for OpenF1 strategy data to avoid repeated API calls
_STRATEGY_CACHE: Dict[str, Dict[str, Any]] = {}


class PitStopType(Enum):
    """Types of pit stops."""

    TIRE_CHANGE = "TIRE_CHANGE"
    REPAIR = "REPAIR"
    PENALTY = "PENALTY"


@dataclass
class PitStop:
    """Represents a single pit stop event."""

    lap_number: int
    pit_stop_number: int  # 1st, 2nd, 3rd stop
    stop_type: PitStopType
    old_compound: Optional[TireCompound] = None
    new_compound: Optional[TireCompound] = None
    duration: float = 0.0  # seconds
    time_stationary: float = 0.0  # Time actually stopped
    time_lost: float = 0.0  # Total time lost including pit lane
    tyre_age_at_stop: int = 0

    def __post_init__(self):
        """Calculate pit stop duration if not provided."""
        if self.duration == 0.0 and self.stop_type == PitStopType.TIRE_CHANGE:
            self.duration = self._calculate_duration()

    def _calculate_duration(self) -> float:
        """
        Calculate realistic pit stop duration.

        F1 pit stops typically:
        - Best case: ~2.0 seconds (tire change only)
        - Average: ~2.5-3.0 seconds
        - Slow: ~4.0+ seconds (issues, stuck wheel nut, etc.)
        """
        # Base tire change time
        base_time = 2.0

        # Add randomness for human error, equipment issues
        variation = random.gauss(0.5, 0.3)  # Mean 0.5s, std 0.3s
        variation = max(0.0, variation)  # No negative times

        # Occasional slow stops
        if random.random() < 0.05:  # 5% chance of slow stop
            variation += random.uniform(1.0, 3.0)

        return base_time + variation


def get_openf1_strategy_data(circuit_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetch stint strategy data from OpenF1 API for a circuit.
    
    Args:
        circuit_name: Name of the circuit (our internal name)
    
    Returns:
        Strategy data with average stint lengths by compound, or None
    """
    # Map our circuit name to OpenF1 circuit_short_name
    openf1_circuit_name = CIRCUIT_NAME_MAPPING.get(circuit_name.lower())
    
    if not openf1_circuit_name:
        print(f"⚠️ No OpenF1 mapping for circuit: {circuit_name}")
        return None
    
    # Check cache first
    cache_key = circuit_name.lower()
    if cache_key in _STRATEGY_CACHE:
        return _STRATEGY_CACHE[cache_key]
    
    try:
        from shifters.data.openf1_client import OpenF1Client
        
        client = OpenF1Client()
        strategy = client.analyze_circuit_strategy(openf1_circuit_name, year=2024)
        
        if strategy and "error" not in strategy:
            print(f"✅ OpenF1 data loaded for {circuit_name} ({openf1_circuit_name})")
            _STRATEGY_CACHE[cache_key] = strategy
            return strategy
        else:
            print(f"❌ No OpenF1 data for {circuit_name}: {strategy.get('error') if strategy else 'Unknown error'}")
    except Exception as e:
        print(f"❌ Error fetching OpenF1 data for {circuit_name}: {e}")
    
    return None


class PitStopStrategy:
    """
    Manages pit stop strategy and execution for a race.
    
    Uses real OpenF1 API data when available to plan realistic strategies
    based on historical stint lengths and compound usage.
    """

    def __init__(
        self,
        total_laps: int,
        track_length: float,
        pit_lane_time_loss: float = 20.0,
        circuit_name: Optional[str] = None,
    ):
        """
        Initialize pit stop strategy.

        Args:
            total_laps: Total race laps
            track_length: Track length in meters
            pit_lane_time_loss: Time lost driving through pit lane (seconds)
        """
        self.total_laps = total_laps
        self.track_length = track_length
        self.pit_lane_time_loss = pit_lane_time_loss
        self.circuit_name = circuit_name

        self.planned_stops: List[Tuple[int, TireCompound]] = []
        self.completed_stops: List[PitStop] = []
        
        # Fetch real F1 strategy data if available
        self.openf1_data = None
        if circuit_name:
            self.openf1_data = get_openf1_strategy_data(circuit_name)

        # Simplified pit stop state
        self.in_pit_lane = False
        self.current_stop_timer = 0.0
        self.current_stop_data: Optional[PitStop] = None
        self.new_tires_ready: Optional[TireSet] = None

    def plan_strategy(
        self, starting_compound: TireCompound, target_stops: int = 1, seed_offset: int = 0
    ) -> List[Tuple[int, TireCompound]]:
        """
        Generate a pit stop strategy using OpenF1 historical data when available.

        Args:
            starting_compound: Compound to start the race
            target_stops: Number of pit stops to plan (1-3 typical)
            seed_offset: Offset for randomization to ensure different strategies per agent

        Returns:
            List of (lap_number, tire_compound) tuples
        """
        self.planned_stops = []

        if target_stops == 0:
            return self.planned_stops
        
        # Use OpenF1 data if available to determine realistic stint lengths
        if self.openf1_data and 'average_stint_lengths' in self.openf1_data:
            return self._plan_from_openf1_data(starting_compound, target_stops, seed_offset)
        
        # Fallback to basic distribution
        return self._plan_basic_strategy(starting_compound, target_stops, seed_offset)
    
    def _plan_basic_strategy(
        self, starting_compound: TireCompound, target_stops: int, seed_offset: int
    ) -> List[Tuple[int, TireCompound]]:
        """Fallback strategy when OpenF1 data is not available."""
        # Distribute stops across race distance
        laps_per_stint = self.total_laps // (target_stops + 1)

        # Common F1 strategies
        strategies = {
            1: [  # One-stop strategies
                [TireCompound.MEDIUM, TireCompound.HARD],
                [TireCompound.SOFT, TireCompound.MEDIUM],
            ],
            2: [  # Two-stop strategies
                [
                    TireCompound.SOFT,
                    TireCompound.MEDIUM,
                    TireCompound.SOFT,
                ],
                [
                    TireCompound.MEDIUM,
                    TireCompound.HARD,
                    TireCompound.MEDIUM,
                ],
                [
                    TireCompound.SOFT,
                    TireCompound.MEDIUM,
                    TireCompound.HARD,
                ],
            ],
            3: [  # Three-stop strategies (aggressive)
                [
                    TireCompound.SOFT,
                    TireCompound.SOFT,
                    TireCompound.MEDIUM,
                    TireCompound.SOFT,
                ],
                [
                    TireCompound.MEDIUM,
                    TireCompound.SOFT,
                    TireCompound.SOFT,
                    TireCompound.MEDIUM,
                ],
            ],
        }

        # Select a strategy
        if target_stops in strategies:
            strategy_options = strategies[target_stops]
            compounds = random.choice(strategy_options)

            # Plan stop laps with better distribution
            for i in range(target_stops):
                stop_lap = (i + 1) * laps_per_stint
                # Add variation that's a percentage of stint length (not just ±2 laps)
                # Use seed_offset to ensure different strategies per agent
                variation_range = max(2, int(laps_per_stint * 0.15))  # 15% of stint length
                variation = ((seed_offset + i * 37) % (variation_range * 2 + 1)) - variation_range
                stop_lap += variation
                stop_lap = max(2, min(self.total_laps - 2, stop_lap))

                next_compound = compounds[i + 1]
                self.planned_stops.append((stop_lap, next_compound))

        return self.planned_stops
    
    def _plan_from_openf1_data(
        self, starting_compound: TireCompound, target_stops: int, seed_offset: int
    ) -> List[Tuple[int, TireCompound]]:
        """
        Plan strategy using real OpenF1 stint length data.
        
        Uses historical average stint lengths for each compound to create
        realistic pit stop strategies.
        """
        avg_stints = self.openf1_data['average_stint_lengths']
        
        # Map our compounds to OpenF1 compound names
        compound_map = {
            TireCompound.SOFT: 'SOFT',
            TireCompound.MEDIUM: 'MEDIUM',
            TireCompound.HARD: 'HARD',
        }
        
        # Common F1 strategies based on number of stops
        strategies = {
            1: [  # One-stop strategies
                [TireCompound.MEDIUM, TireCompound.HARD],
                [TireCompound.SOFT, TireCompound.MEDIUM],
            ],
            2: [  # Two-stop strategies
                [TireCompound.SOFT, TireCompound.MEDIUM, TireCompound.SOFT],
                [TireCompound.MEDIUM, TireCompound.HARD, TireCompound.MEDIUM],
            ],
            3: [  # Three-stop (aggressive)
                [TireCompound.SOFT, TireCompound.SOFT, TireCompound.MEDIUM, TireCompound.SOFT],
            ],
        }
        
        if target_stops not in strategies:
            return self._plan_basic_strategy(starting_compound, target_stops, seed_offset)
        
        # Select strategy
        strategy_compounds = strategies[target_stops][seed_offset % len(strategies[target_stops])]
        
        # Calculate pit stop laps based on average stint lengths from OpenF1
        current_lap = 1
        for i in range(target_stops):
            # Get compound for this stint
            stint_compound = strategy_compounds[i]
            openf1_compound = compound_map.get(stint_compound, 'MEDIUM')
            
            # Use OpenF1 average stint length if available, otherwise estimate
            if openf1_compound in avg_stints:
                stint_length = int(avg_stints[openf1_compound])
            else:
                # Fallback: estimate based on compound
                stint_length_estimates = {
                    TireCompound.SOFT: int(self.total_laps * 0.25),
                    TireCompound.MEDIUM: int(self.total_laps * 0.35),
                    TireCompound.HARD: int(self.total_laps * 0.45),
                }
                stint_length = stint_length_estimates.get(stint_compound, self.total_laps // (target_stops + 1))
            
            # Add small agent-specific variation (±10% of stint length)
            variation_range = max(2, int(stint_length * 0.1))
            variation = ((seed_offset + i * 37) % (variation_range * 2 + 1)) - variation_range
            stint_length += variation
            
            # Calculate pit lap
            pit_lap = current_lap + stint_length
            pit_lap = max(2, min(self.total_laps - 2, pit_lap))
            
            # Next compound after this pit stop
            next_compound = strategy_compounds[i + 1]
            self.planned_stops.append((pit_lap, next_compound))
            
            # Update for next stint
            current_lap = pit_lap
        
        return self.planned_stops

    def should_pit(
        self, current_lap: int, current_tires: TireSet, is_damaged: bool = False
    ) -> bool:
        """
        Determine if vehicle should pit on this lap.

        Args:
            current_lap: Current lap number
            current_tires: Current tire set
            is_damaged: Whether vehicle has damage

        Returns:
            True if should pit this lap
        """
        # Always pit if damaged
        if is_damaged:
            return True

        # Check if tires critically worn
        if current_tires.needs_replacement():
            return True

        # Check planned strategy
        for planned_lap, _ in self.planned_stops:
            if current_lap == planned_lap:
                return True

        return False

    def execute_pit_entry(self, current_lap: int, current_tires: TireSet) -> None:
        """
        Start pit stop procedure.

        Args:
            current_lap: Current lap number
            current_tires: Current tire set
        """
        if self.in_pit_lane:
            return  # Already in pit lane
            
        self.in_pit_lane = True
        self.current_stop_timer = 0.0

        # Find planned compound or choose best available
        new_compound = TireCompound.MEDIUM
        for planned_lap, compound in self.planned_stops:
            if abs(planned_lap - current_lap) <= 1:
                new_compound = compound
                break

        # Create pit stop record
        self.current_stop_data = PitStop(
            lap_number=current_lap,
            pit_stop_number=len(self.completed_stops) + 1,
            stop_type=PitStopType.TIRE_CHANGE,
            old_compound=current_tires.compound,
            new_compound=new_compound,
            tyre_age_at_stop=current_tires.laps_used,
        )
        
        # Prepare new tires immediately
        self.new_tires_ready = TireSet(
            compound=new_compound,
            age_at_fitting=0,
            initial_temperature=60.0,
        )

    def update_pit_stop(self, dt: float) -> Tuple[bool, Optional[TireSet]]:
        """
        Update pit stop progress. 
        
        Simplified: Just wait for stop duration + pit lane time, then complete.

        Args:
            dt: Time step in seconds

        Returns:
            (stop_complete, new_tire_set) tuple
        """
        if not self.in_pit_lane or self.current_stop_data is None:
            return False, None

        # Update timer
        self.current_stop_timer += dt
        
        # Total time = pit stop duration + pit lane transit time  
        total_time_needed = self.current_stop_data.duration + self.pit_lane_time_loss
        
        # Check if stop is complete
        if self.current_stop_timer >= total_time_needed:
            # Complete the stop
            self.current_stop_data.time_stationary = self.current_stop_data.duration
            self.current_stop_data.time_lost = total_time_needed
            
            self.completed_stops.append(self.current_stop_data)
            
            # Get new tires
            new_tires = self.new_tires_ready
            
            # Reset state
            self.in_pit_lane = False
            self.current_stop_data = None
            self.new_tires_ready = None
            self.current_stop_timer = 0.0
            
            return True, new_tires

        return False, None

    def get_strategy_info(self) -> dict:
        """Get strategy information for serialization."""
        return {
            "planned_stops": [
                {"lap": lap, "compound": comp.value}
                for lap, comp in self.planned_stops
            ],
            "completed_stops": [
                {
                    "lap": stop.lap_number,
                    "stop_number": stop.pit_stop_number,
                    "old_compound": stop.old_compound.value
                    if stop.old_compound
                    else None,
                    "new_compound": stop.new_compound.value
                    if stop.new_compound
                    else None,
                    "duration": round(stop.duration, 2),
                    "time_lost": round(stop.time_lost, 1),
                }
                for stop in self.completed_stops
            ],
            "in_pit_lane": self.in_pit_lane,
        }

    def get_total_time_lost(self) -> float:
        """Calculate total time lost to pit stops."""
        return sum(stop.time_lost for stop in self.completed_stops)

    def __repr__(self) -> str:
        return (
            f"PitStopStrategy({len(self.completed_stops)} stops completed, "
            f"{len(self.planned_stops)} planned)"
        )
