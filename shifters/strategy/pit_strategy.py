"""Optimal pit strategy calculator based on F1-metrics research."""

from typing import List, Dict, Tuple, Optional
import numpy as np
from dataclasses import dataclass


@dataclass
class TireCompound:
    """Tire compound characteristics."""
    name: str
    degradation_rate: float  # Quadratic coefficient
    fresh_advantage: float  # Lap time advantage when fresh (seconds)
    durability: float  # Relative durability (0-1, where 1 = most durable)


@dataclass
class PitStrategy:
    """Represents a pit strategy."""
    stops: int
    stint_lengths: List[int]  # Laps per stint
    tire_compounds: List[str]  # Tire for each stint
    total_time: float  # Estimated total race time
    description: str


class PitStrategyCalculator:
    """
    Calculate optimal pit strategies based on tire characteristics.
    
    Based on F1-metrics methodology:
    - Tire degradation profiles (quadratic)
    - Crossover points between compounds
    - Pit-stop time penalties
    - Fuel burn effects
    """
    
    def __init__(
        self,
        race_laps: int,
        pit_stop_time: float = 22.5,  # seconds (in-lap + out-lap)
        in_lap_penalty: float = 4.0,  # seconds
        fuel_effect: float = 0.037,  # seconds per lap of fuel
    ):
        """
        Initialize strategy calculator.
        
        Args:
            race_laps: Total laps in race
            pit_stop_time: Time lost in pit lane
            in_lap_penalty: Time lost on in-lap
            fuel_effect: Lap time improvement per lap of fuel burned
        """
        self.race_laps = race_laps
        self.pit_stop_time = pit_stop_time
        self.in_lap_penalty = in_lap_penalty
        self.fuel_effect = fuel_effect
        
        # Define tire compounds (F1 2014-style)
        self.compounds = {
            "prime": TireCompound(
                name="Prime (Hard)",
                degradation_rate=0.0015,  # Quadratic coefficient
                fresh_advantage=0.0,  # Baseline
                durability=1.0,
            ),
            "option": TireCompound(
                name="Option (Soft)",
                degradation_rate=0.003,  # 2x faster degradation
                fresh_advantage=-0.7,  # 0.7s faster when fresh
                durability=0.5,  # Half as durable
            ),
        }
    
    def calculate_lap_time(
        self,
        base_lap_time: float,
        tire_age: int,
        compound: str,
        fuel_laps_remaining: int,
    ) -> float:
        """
        Calculate lap time based on tire age and fuel load.
        
        Formula: LapTime = Base + TireDeg + FuelAdj
        TireDeg = degradation_rate * tire_age²
        
        Args:
            base_lap_time: Base lap time on fresh prime tires
            tire_age: Age of current tires (laps)
            compound: Tire compound ("prime" or "option")
            fuel_laps_remaining: Laps of fuel remaining
            
        Returns:
            Predicted lap time in seconds
        """
        tire = self.compounds[compound]
        
        # Tire degradation (quadratic)
        tire_deg = tire.degradation_rate * (tire_age ** 2)
        
        # Fuel effect (lighter car = faster)
        fuel_adj = -self.fuel_effect * (self.race_laps - fuel_laps_remaining)
        
        # Fresh tire advantage
        fresh_advantage = tire.fresh_advantage if tire_age == 0 else 0.0
        
        return base_lap_time + tire_deg + fuel_adj + fresh_advantage
    
    def calculate_crossover_point(
        self,
        base_lap_time: float,
        compound1: str = "option",
        compound2: str = "prime",
    ) -> int:
        """
        Calculate crossover point where compound1 becomes slower than fresh compound2.
        
        This is critical for undercut strategy.
        
        Args:
            base_lap_time: Base lap time
            compound1: First compound (typically option)
            compound2: Second compound (typically prime)
            
        Returns:
            Lap number where crossover occurs
        """
        for lap in range(1, 50):
            time1 = self.calculate_lap_time(base_lap_time, lap, compound1, self.race_laps - lap)
            time2 = self.calculate_lap_time(base_lap_time, 0, compound2, self.race_laps - lap)
            
            if time1 > time2:
                return lap
        
        return 50  # No crossover within reasonable range
    
    def simulate_strategy(
        self,
        base_lap_time: float,
        stint_lengths: List[int],
        tire_compounds: List[str],
    ) -> float:
        """
        Simulate a specific strategy and return total race time.
        
        Args:
            base_lap_time: Base lap time on fresh prime tires
            stint_lengths: List of stint lengths in laps
            tire_compounds: List of tire compounds for each stint
            
        Returns:
            Total race time in seconds
        """
        total_time = 0.0
        fuel_remaining = self.race_laps
        
        for stint_idx, (stint_length, compound) in enumerate(zip(stint_lengths, tire_compounds)):
            # Simulate each lap in the stint
            for tire_age in range(stint_length):
                lap_time = self.calculate_lap_time(
                    base_lap_time, tire_age, compound, fuel_remaining
                )
                total_time += lap_time
                fuel_remaining -= 1
            
            # Add pit-stop time (except after last stint)
            if stint_idx < len(stint_lengths) - 1:
                total_time += self.pit_stop_time + self.in_lap_penalty
        
        return total_time
    
    def find_optimal_strategy(
        self,
        base_lap_time: float,
        max_stops: int = 3,
    ) -> List[PitStrategy]:
        """
        Find optimal strategies for different numbers of stops.
        
        Args:
            base_lap_time: Base lap time on fresh prime tires
            max_stops: Maximum number of pit stops to consider
            
        Returns:
            List of PitStrategy objects, sorted by total time
        """
        strategies = []
        
        # Calculate crossover point
        crossover = self.calculate_crossover_point(base_lap_time)
        
        # 1-stop strategies
        for option_stint_length in range(10, self.race_laps - 10):
            prime_stint_length = self.race_laps - option_stint_length
            
            # Option first, then prime
            time1 = self.simulate_strategy(
                base_lap_time,
                [option_stint_length, prime_stint_length],
                ["option", "prime"]
            )
            strategies.append(PitStrategy(
                stops=1,
                stint_lengths=[option_stint_length, prime_stint_length],
                tire_compounds=["option", "prime"],
                total_time=time1,
                description=f"1-stop: {option_stint_length}L option → {prime_stint_length}L prime"
            ))
            
            # Prime first, then option
            time2 = self.simulate_strategy(
                base_lap_time,
                [prime_stint_length, option_stint_length],
                ["prime", "option"]
            )
            strategies.append(PitStrategy(
                stops=1,
                stint_lengths=[prime_stint_length, option_stint_length],
                tire_compounds=["prime", "option"],
                total_time=time2,
                description=f"1-stop: {prime_stint_length}L prime → {option_stint_length}L option"
            ))
        
        # 2-stop strategies
        if max_stops >= 2:
            for stint1 in range(10, self.race_laps - 20):
                for stint2 in range(10, self.race_laps - stint1 - 10):
                    stint3 = self.race_laps - stint1 - stint2
                    
                    if stint3 < 10:
                        continue
                    
                    # Try different compound combinations
                    compound_combos = [
                        (["option", "option", "prime"], "2-stop: 2x option, 1x prime"),
                        (["option", "prime", "option"], "2-stop: option-prime-option"),
                        (["prime", "option", "prime"], "2-stop: prime-option-prime"),
                        (["prime", "prime", "option"], "2-stop: 2x prime, 1x option"),
                    ]
                    
                    for compounds, desc in compound_combos:
                        time = self.simulate_strategy(
                            base_lap_time,
                            [stint1, stint2, stint3],
                            compounds
                        )
                        strategies.append(PitStrategy(
                            stops=2,
                            stint_lengths=[stint1, stint2, stint3],
                            tire_compounds=compounds,
                            total_time=time,
                            description=f"{desc} ({stint1}L-{stint2}L-{stint3}L)"
                        ))
        
        # Sort by total time
        strategies.sort(key=lambda s: s.total_time)
        
        return strategies[:10]  # Return top 10 strategies
    
    def calculate_undercut_window(
        self,
        base_lap_time: float,
        current_tire_age: int,
        current_compound: str,
    ) -> Tuple[int, int]:
        """
        Calculate the optimal undercut window.
        
        Returns the lap range where pitting would gain time over staying out.
        
        Args:
            base_lap_time: Base lap time
            current_tire_age: Current tire age
            current_compound: Current tire compound
            
        Returns:
            (earliest_lap, latest_lap) for undercut window
        """
        crossover = self.calculate_crossover_point(base_lap_time)
        
        # Undercut window is typically 2-3 laps before crossover
        earliest = max(1, crossover - 3)
        latest = crossover + 1
        
        return earliest, latest
    
    def should_react_to_undercut(
        self,
        my_tire_age: int,
        opponent_pitted: bool,
        laps_since_opponent_pit: int,
    ) -> bool:
        """
        Determine if should pit in response to opponent's undercut attempt.
        
        Args:
            my_tire_age: Age of my current tires
            opponent_pitted: Whether opponent just pitted
            laps_since_opponent_pit: Laps since opponent pitted
            
        Returns:
            True if should pit in response
        """
        if not opponent_pitted:
            return False
        
        # If opponent pitted 1-2 laps ago and my tires are old, react
        if 1 <= laps_since_opponent_pit <= 2 and my_tire_age > 10:
            return True
        
        return False
