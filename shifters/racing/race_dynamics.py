"""
Race dynamics module for DRS, overtaking, and car-to-car interactions.

Based on F1Metrics methodology for realistic racing simulation.
"""

from typing import Optional, List, TYPE_CHECKING
from dataclasses import dataclass

if TYPE_CHECKING:
    from shifters.agents.base_agent import RacingVehicle


@dataclass
class TrackCharacteristics:
    """
    Track-specific parameters affecting racing dynamics.
    
    Based on F1Metrics methodology for realistic circuit modeling.
    """
    
    name: str
    
    # Overtaking difficulty multiplier (higher = harder to pass)
    # Monaco: 2.5 (very difficult)
    # Monza/Bahrain: 0.6 (easier overtaking)
    # Average: 1.0
    overtaking_difficulty: float = 1.0
    
    # Tire degradation severity multiplier
    # Spain/Barcelona: 1.3 (high degradation)
    # Sochi: 0.7 (low degradation)
    # Average: 1.0
    tire_degradation_factor: float = 1.0
    
    # DRS zones count (typical F1 tracks have 1-3)
    drs_zones: int = 1
    
    # DRS time advantage in seconds (typical: 0.3-0.5s)
    drs_lap_time_gain: float = 0.4
    
    # Base lap time for reference (seconds)
    base_lap_time: float = 90.0
    
    # Slipstream benefit (seconds gained per lap following closely)
    slipstream_benefit: float = 0.2
    
    # Dirty air penalty (seconds lost per lap following mid-distance)
    dirty_air_penalty: float = 0.3


# F1 2025 Track Parameters (based on historical data and F1Metrics analysis)
TRACK_DATABASE = {
    "monaco": TrackCharacteristics(
        name="Monaco",
        overtaking_difficulty=2.5,  # Nearly impossible to overtake
        tire_degradation_factor=0.8,  # Low speed = less tire wear
        drs_zones=1,
        drs_lap_time_gain=0.3,  # DRS less effective on tight street circuit
        base_lap_time=72.0,
        slipstream_benefit=0.1,  # Little slipstream benefit
        dirty_air_penalty=0.2,
    ),
    "bahrain": TrackCharacteristics(
        name="Bahrain",
        overtaking_difficulty=0.6,  # Excellent overtaking
        tire_degradation_factor=1.2,  # Abrasive surface
        drs_zones=2,
        drs_lap_time_gain=0.5,  # Long straights
        base_lap_time=88.0,
        slipstream_benefit=0.3,
        dirty_air_penalty=0.25,
    ),
    "jeddah": TrackCharacteristics(
        name="Jeddah",
        overtaking_difficulty=0.8,  # High-speed street circuit
        tire_degradation_factor=0.9,
        drs_zones=2,
        drs_lap_time_gain=0.45,
        base_lap_time=90.0,
        slipstream_benefit=0.35,
        dirty_air_penalty=0.3,
    ),
    "melbourne": TrackCharacteristics(
        name="Melbourne",
        overtaking_difficulty=1.3,  # Limited opportunities
        tire_degradation_factor=1.0,
        drs_zones=2,
        drs_lap_time_gain=0.4,
        base_lap_time=78.0,
        slipstream_benefit=0.2,
        dirty_air_penalty=0.25,
    ),
    "suzuka": TrackCharacteristics(
        name="Suzuka",
        overtaking_difficulty=1.1,  # Some overtaking in first sector
        tire_degradation_factor=1.1,  # High-speed corners
        drs_zones=1,
        drs_lap_time_gain=0.4,
        base_lap_time=88.0,
        slipstream_benefit=0.25,
        dirty_air_penalty=0.35,  # Technical circuit suffers from dirty air
    ),
    "shanghai": TrackCharacteristics(
        name="Shanghai",
        overtaking_difficulty=0.9,  # Long back straight
        tire_degradation_factor=1.0,
        drs_zones=2,
        drs_lap_time_gain=0.45,
        base_lap_time=92.0,
        slipstream_benefit=0.3,
        dirty_air_penalty=0.25,
    ),
    "miami": TrackCharacteristics(
        name="Miami",
        overtaking_difficulty=1.0,  # Average street circuit
        tire_degradation_factor=0.95,
        drs_zones=2,
        drs_lap_time_gain=0.4,
        base_lap_time=88.0,
        slipstream_benefit=0.25,
        dirty_air_penalty=0.25,
    ),
    "imola": TrackCharacteristics(
        name="Imola",
        overtaking_difficulty=1.5,  # Very difficult
        tire_degradation_factor=0.85,  # Lower speeds
        drs_zones=2,
        drs_lap_time_gain=0.35,
        base_lap_time=75.0,
        slipstream_benefit=0.2,
        dirty_air_penalty=0.3,
    ),
    "monza": TrackCharacteristics(
        name="Monza",
        overtaking_difficulty=0.5,  # Temple of Speed - easiest to overtake
        tire_degradation_factor=0.9,  # Low downforce
        drs_zones=2,
        drs_lap_time_gain=0.5,  # Huge DRS effect
        base_lap_time=80.0,
        slipstream_benefit=0.4,  # Maximum slipstream
        dirty_air_penalty=0.15,  # Low downforce = less dirty air
    ),
    "montreal": TrackCharacteristics(
        name="Montreal",
        overtaking_difficulty=0.85,  # Good overtaking
        tire_degradation_factor=1.0,
        drs_zones=2,
        drs_lap_time_gain=0.45,
        base_lap_time=72.0,
        slipstream_benefit=0.3,
        dirty_air_penalty=0.2,
    ),
    "barcelona": TrackCharacteristics(
        name="Barcelona",
        overtaking_difficulty=1.6,  # Difficult to overtake
        tire_degradation_factor=1.3,  # High degradation
        drs_zones=2,
        drs_lap_time_gain=0.4,
        base_lap_time=78.0,
        slipstream_benefit=0.25,
        dirty_air_penalty=0.35,
    ),
    "spielberg": TrackCharacteristics(
        name="Red Bull Ring",
        overtaking_difficulty=0.75,  # Good overtaking
        tire_degradation_factor=1.0,
        drs_zones=2,
        drs_lap_time_gain=0.45,
        base_lap_time=65.0,
        slipstream_benefit=0.3,
        dirty_air_penalty=0.2,
    ),
    "silverstone": TrackCharacteristics(
        name="Silverstone",
        overtaking_difficulty=1.0,  # Average
        tire_degradation_factor=1.15,  # High-speed corners
        drs_zones=2,
        drs_lap_time_gain=0.45,
        base_lap_time=87.0,
        slipstream_benefit=0.3,
        dirty_air_penalty=0.3,
    ),
    "hungaroring": TrackCharacteristics(
        name="Hungaroring",
        overtaking_difficulty=2.0,  # Monaco-like difficulty
        tire_degradation_factor=1.0,
        drs_zones=1,
        drs_lap_time_gain=0.35,
        base_lap_time=76.0,
        slipstream_benefit=0.15,
        dirty_air_penalty=0.25,
    ),
    "spa": TrackCharacteristics(
        name="Spa-Francorchamps",
        overtaking_difficulty=0.7,  # Kemmel straight provides opportunities
        tire_degradation_factor=1.1,
        drs_zones=2,
        drs_lap_time_gain=0.5,
        base_lap_time=105.0,
        slipstream_benefit=0.35,
        dirty_air_penalty=0.25,
    ),
    "zandvoort": TrackCharacteristics(
        name="Zandvoort",
        overtaking_difficulty=1.7,  # Very difficult
        tire_degradation_factor=0.95,
        drs_zones=1,
        drs_lap_time_gain=0.35,
        base_lap_time=71.0,
        slipstream_benefit=0.2,
        dirty_air_penalty=0.3,
    ),
    "singapore": TrackCharacteristics(
        name="Singapore",
        overtaking_difficulty=1.4,  # Difficult street circuit
        tire_degradation_factor=0.9,  # Low speeds
        drs_zones=2,
        drs_lap_time_gain=0.4,
        base_lap_time=98.0,
        slipstream_benefit=0.2,
        dirty_air_penalty=0.25,
    ),
    "austin": TrackCharacteristics(
        name="Circuit of the Americas",
        overtaking_difficulty=0.9,  # Good overtaking opportunities
        tire_degradation_factor=1.1,
        drs_zones=2,
        drs_lap_time_gain=0.45,
        base_lap_time=95.0,
        slipstream_benefit=0.3,
        dirty_air_penalty=0.25,
    ),
    "mexico": TrackCharacteristics(
        name="Mexico City",
        overtaking_difficulty=0.8,  # Long straight
        tire_degradation_factor=0.85,  # High altitude = less drag
        drs_zones=1,
        drs_lap_time_gain=0.5,  # Thin air = massive DRS effect
        base_lap_time=77.0,
        slipstream_benefit=0.35,
        dirty_air_penalty=0.2,  # Less downforce at altitude
    ),
    "interlagos": TrackCharacteristics(
        name="Interlagos",
        overtaking_difficulty=1.0,  # Average
        tire_degradation_factor=1.0,
        drs_zones=2,
        drs_lap_time_gain=0.4,
        base_lap_time=70.0,
        slipstream_benefit=0.25,
        dirty_air_penalty=0.25,
    ),
    "lasvegas": TrackCharacteristics(
        name="Las Vegas",
        overtaking_difficulty=0.7,  # Long straights
        tire_degradation_factor=0.8,  # Cold night race
        drs_zones=2,
        drs_lap_time_gain=0.5,
        base_lap_time=95.0,
        slipstream_benefit=0.35,
        dirty_air_penalty=0.2,
    ),
    "losail": TrackCharacteristics(
        name="Qatar",
        overtaking_difficulty=1.1,  # Some opportunities
        tire_degradation_factor=1.2,  # Abrasive + hot
        drs_zones=2,
        drs_lap_time_gain=0.45,
        base_lap_time=82.0,
        slipstream_benefit=0.3,
        dirty_air_penalty=0.25,
    ),
    "yas_marina": TrackCharacteristics(
        name="Abu Dhabi",
        overtaking_difficulty=1.2,  # Improved but still difficult
        tire_degradation_factor=0.95,
        drs_zones=2,
        drs_lap_time_gain=0.45,
        base_lap_time=86.0,
        slipstream_benefit=0.25,
        dirty_air_penalty=0.25,
    ),
}


class DRSSystem:
    """
    DRS (Drag Reduction System) management.
    
    F1Metrics Model:
    - DRS available when within 1 second at detection point
    - Provides ~0.3-0.5s lap time advantage
    """
    
    def __init__(self, track_characteristics: TrackCharacteristics):
        """
        Initialize DRS system.
        
        Args:
            track_characteristics: Track-specific DRS parameters
        """
        self.track = track_characteristics
        self.detection_threshold = 1.0  # seconds gap
    
    def is_drs_available(self, gap_to_car_ahead: float, lap_number: int) -> bool:
        """
        Check if DRS is available for this car.
        
        Args:
            gap_to_car_ahead: Time gap to car ahead in seconds
            lap_number: Current lap number (DRS not available on lap 1)
        
        Returns:
            True if DRS can be activated
        """
        # DRS not available on first lap
        if lap_number < 2:
            return False
        
        # Must be within detection threshold
        return gap_to_car_ahead <= self.detection_threshold
    
    def get_drs_benefit(self) -> float:
        """
        Get lap time benefit from DRS activation.
        
        Returns:
            Time saved per lap in seconds
        """
        return self.track.drs_lap_time_gain


class OvertakingModel:
    """
    Overtaking mechanics based on F1Metrics methodology.
    
    F1Metrics Model:
    - Need ~1.2s advantage to overtake (track-dependent)
    - DRS, slipstream, and tire advantage all contribute
    - Dirty air penalty when following mid-distance
    """
    
    def __init__(self, track_characteristics: TrackCharacteristics):
        """
        Initialize overtaking model.
        
        Args:
            track_characteristics: Track-specific overtaking parameters
        """
        self.track = track_characteristics
        self.base_threshold = 1.2  # seconds - base overtaking threshold
    
    def calculate_overtaking_threshold(self) -> float:
        """
        Calculate time advantage needed to overtake on this track.
        
        Returns:
            Threshold in seconds
        """
        return self.base_threshold * self.track.overtaking_difficulty
    
    def calculate_gap_effect(self, gap_seconds: float) -> float:
        """
        Calculate aerodynamic effect based on gap to car ahead.
        
        Args:
            gap_seconds: Gap to car ahead in seconds
        
        Returns:
            Lap time delta (negative = penalty, positive = benefit)
        """
        if gap_seconds < 0.5:
            # Very close: slipstream benefit
            return self.track.slipstream_benefit
        elif gap_seconds < 1.5:
            # Following distance: dirty air penalty
            return -self.track.dirty_air_penalty
        else:
            # Clean air
            return 0.0
    
    def can_overtake(
        self,
        pace_advantage: float,
        gap_seconds: float,
        has_drs: bool = False,
        tire_advantage: float = 0.0,
    ) -> bool:
        """
        Determine if overtake is possible.
        
        Args:
            pace_advantage: Lap time advantage in seconds
            gap_seconds: Current gap to car ahead
            has_drs: Whether DRS is active
            tire_advantage: Tire grip advantage (fresher tires)
        
        Returns:
            True if overtake should succeed
        """
        threshold = self.calculate_overtaking_threshold()
        
        # Calculate total advantage
        total_advantage = pace_advantage + tire_advantage
        
        if has_drs:
            total_advantage += self.track.drs_lap_time_gain
        
        # Add slipstream if close enough
        if gap_seconds < 0.5:
            total_advantage += self.track.slipstream_benefit
        
        return total_advantage >= threshold


def get_track_characteristics(track_name: str) -> TrackCharacteristics:
    """
    Get track characteristics by name.
    
    Args:
        track_name: Name of the track (e.g., "monaco", "monza")
    
    Returns:
        TrackCharacteristics for the specified track, or default if not found
    """
    track_key = track_name.lower().replace(" ", "").replace("-", "_")
    
    return TRACK_DATABASE.get(
        track_key,
        TrackCharacteristics(name=track_name)  # Default characteristics
    )
