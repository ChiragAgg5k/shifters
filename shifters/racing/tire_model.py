"""Tire compound and degradation modeling for F1 racing simulation."""

from dataclasses import dataclass
from enum import Enum
from typing import Optional
import math


class TireCompound(Enum):
    """F1 tire compounds available during a race."""

    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"


@dataclass
class TireCharacteristics:
    """Physical characteristics of tire compounds."""

    compound: TireCompound
    base_grip: float  # Base grip coefficient (0.0 - 1.0)
    degradation_rate: float  # % per lap at normal usage
    optimal_temp_min: float  # Celsius
    optimal_temp_max: float  # Celsius
    warmup_laps: int  # Laps to reach optimal temperature
    max_life: int  # Maximum recommended laps


# F1 2025 tire characteristics (based on Pirelli specs)
TIRE_SPECS = {
    TireCompound.SOFT: TireCharacteristics(
        compound=TireCompound.SOFT,
        base_grip=1.0,
        degradation_rate=2.5,  # Degrades faster
        optimal_temp_min=90.0,
        optimal_temp_max=110.0,
        warmup_laps=1,
        max_life=20,
    ),
    TireCompound.MEDIUM: TireCharacteristics(
        compound=TireCompound.MEDIUM,
        base_grip=0.95,
        degradation_rate=1.5,  # Balanced degradation
        optimal_temp_min=85.0,
        optimal_temp_max=105.0,
        warmup_laps=2,
        max_life=35,
    ),
    TireCompound.HARD: TireCharacteristics(
        compound=TireCompound.HARD,
        base_grip=0.90,
        degradation_rate=0.8,  # Degrades slower
        optimal_temp_min=80.0,
        optimal_temp_max=100.0,
        warmup_laps=3,
        max_life=50,
    ),
    TireCompound.INTERMEDIATE: TireCharacteristics(
        compound=TireCompound.INTERMEDIATE,
        base_grip=0.85,
        degradation_rate=1.2,
        optimal_temp_min=70.0,
        optimal_temp_max=90.0,
        warmup_laps=2,
        max_life=30,
    ),
    TireCompound.WET: TireCharacteristics(
        compound=TireCompound.WET,
        base_grip=0.75,
        degradation_rate=1.0,
        optimal_temp_min=60.0,
        optimal_temp_max=80.0,
        warmup_laps=2,
        max_life=40,
    ),
}


class TireSet:
    """
    Represents a set of tires with wear, temperature, and performance modeling.
    """

    def __init__(
        self,
        compound: TireCompound,
        age_at_fitting: int = 0,
        initial_temperature: float = 60.0,
    ):
        """
        Initialize a tire set.

        Args:
            compound: The tire compound
            age_at_fitting: How many laps these tires have already done
            initial_temperature: Starting temperature in Celsius
        """
        self.compound = compound
        self.specs = TIRE_SPECS[compound]
        self.laps_used = age_at_fitting
        self.temperature = initial_temperature
        self.wear_percentage = 0.0  # 0% = new, 100% = completely worn
        self.is_damaged = False

        # Track degradation factors
        self._base_degradation = 0.0

    def update(
        self,
        lap_distance: float,
        track_length: float,
        speed: float,
        ambient_temp: float = 25.0,
        is_wet: bool = False,
    ) -> None:
        """
        Update tire state based on usage.

        Args:
            lap_distance: Distance traveled this update (meters)
            track_length: Total track length (meters)
            speed: Current speed (km/h)
            ambient_temp: Ambient temperature (Celsius)
            is_wet: Whether track is wet
        """
        # Update temperature based on speed and ambient
        target_temp = self._calculate_target_temperature(speed, ambient_temp, is_wet)
        temp_change_rate = 0.1
        self.temperature += (target_temp - self.temperature) * temp_change_rate

        # Calculate degradation for this step
        lap_fraction = lap_distance / track_length
        degradation = self._calculate_degradation(speed, is_wet) * lap_fraction

        self.wear_percentage = min(100.0, self.wear_percentage + degradation)

        # Update lap count when completing laps
        if lap_distance >= track_length * 0.95:  # Near lap completion
            self.laps_used += 1

    def _calculate_target_temperature(
        self, speed: float, ambient_temp: float, is_wet: bool
    ) -> float:
        """Calculate target tire temperature based on conditions."""
        # Base temperature from speed (higher speed = more heat)
        speed_factor = min(speed / 300.0, 1.0)  # Normalize to 300 km/h max
        base_temp = ambient_temp + (70.0 * speed_factor)

        # Wet conditions cool tires
        if is_wet:
            base_temp *= 0.7

        return base_temp

    def _calculate_degradation(self, speed: float, is_wet: bool) -> float:
        """
        Calculate tire degradation rate using quadratic model.
        
        Based on F1Metrics methodology: degradation accelerates as tires age.
        Rate increases quadratically with tire age.
        """
        base_rate = self.specs.degradation_rate

        # QUADRATIC DEGRADATION: Rate accelerates as tires age (F1Metrics model)
        # Fresh tires: age_factor ≈ 0, Old tires: age_factor ≈ 1
        tire_age_ratio = self.laps_used / max(self.specs.max_life, 1)
        age_factor = tire_age_ratio ** 2  # Quadratic term
        # Degradation increases by up to 100% at end of life
        age_multiplier = 1.0 + age_factor

        # Speed affects degradation (high speed = more wear)
        speed_factor = 1.0 + (speed / 300.0) * 0.5

        # Temperature affects degradation
        temp_factor = 1.0
        if self.temperature < self.specs.optimal_temp_min:
            # Cold tires wear less but perform worse
            temp_factor = 0.8
        elif self.temperature > self.specs.optimal_temp_max:
            # Overheated tires wear faster
            temp_factor = 1.5

        # Wrong compound for conditions
        compound_factor = 1.0
        if is_wet and self.compound in [
            TireCompound.SOFT,
            TireCompound.MEDIUM,
            TireCompound.HARD,
        ]:
            compound_factor = 3.0  # Slicks in wet degrade very fast
        elif not is_wet and self.compound in [
            TireCompound.INTERMEDIATE,
            TireCompound.WET,
        ]:
            compound_factor = 2.0  # Wet tires on dry degrade fast

        return base_rate * age_multiplier * speed_factor * temp_factor * compound_factor

    def get_grip_level(self, is_wet: bool = False) -> float:
        """
        Calculate current grip level (0.0 - 1.0).

        Returns:
            Grip coefficient considering wear, temperature, and conditions
        """
        base_grip = self.specs.base_grip

        # Wear reduces grip
        wear_factor = 1.0 - (self.wear_percentage / 100.0) * 0.4
        wear_factor = max(0.6, wear_factor)  # Minimum 60% grip even when worn

        # Temperature affects grip
        temp_factor = 1.0
        if (
            self.specs.optimal_temp_min
            <= self.temperature
            <= self.specs.optimal_temp_max
        ):
            temp_factor = 1.0
        elif self.temperature < self.specs.optimal_temp_min:
            # Cold tires have less grip
            temp_diff = self.specs.optimal_temp_min - self.temperature
            temp_factor = max(0.7, 1.0 - temp_diff / 50.0)
        else:
            # Overheated tires lose grip
            temp_diff = self.temperature - self.specs.optimal_temp_max
            temp_factor = max(0.8, 1.0 - temp_diff / 30.0)

        # Wrong compound for conditions penalty
        condition_factor = 1.0
        if is_wet:
            if self.compound == TireCompound.WET:
                condition_factor = 1.2
            elif self.compound == TireCompound.INTERMEDIATE:
                condition_factor = 1.0
            else:
                condition_factor = 0.5  # Slicks in wet are dangerous
        else:
            if self.compound in [TireCompound.INTERMEDIATE, TireCompound.WET]:
                condition_factor = 0.7  # Wet tires on dry lose performance

        # Damage penalty
        damage_factor = 0.3 if self.is_damaged else 1.0

        return base_grip * wear_factor * temp_factor * condition_factor * damage_factor

    def get_performance_multiplier(self, is_wet: bool = False) -> float:
        """
        Get overall performance multiplier for speed calculations.

        Returns:
            Performance factor (0.0 - 1.2)
        """
        grip = self.get_grip_level(is_wet)

        # Fresh tires in optimal conditions can exceed 1.0
        if self.laps_used <= self.specs.warmup_laps and grip > 0.95:
            return min(1.2, grip * 1.1)

        return grip

    def needs_replacement(self) -> bool:
        """Check if tires should be replaced."""
        return (
            self.wear_percentage > 80.0
            or self.laps_used > self.specs.max_life
            or self.is_damaged
        )

    def get_state(self) -> dict:
        """Get tire state for serialization."""
        return {
            "compound": self.compound.value,
            "laps_used": self.laps_used,
            "wear_percentage": round(self.wear_percentage, 1),
            "temperature": round(self.temperature, 1),
            "grip_level": round(self.get_grip_level(), 2),
            "is_damaged": self.is_damaged,
            "needs_replacement": self.needs_replacement(),
        }

    def __repr__(self) -> str:
        return (
            f"TireSet({self.compound.value}, "
            f"{self.laps_used} laps, "
            f"{self.wear_percentage:.1f}% wear)"
        )
