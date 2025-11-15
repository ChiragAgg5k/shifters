"""Safety car system for race simulations."""

from typing import Optional, List
import random


class SafetyCar:
    """
    Manages safety car deployments during races.
    
    Based on F1-metrics research:
    - Probability-based deployment on DNFs
    - 6-lap safety car period
    - Delta time: 120% of normal lap time
    - Safety car pace: 140% of normal lap time
    - Pit window reactions
    """
    
    def __init__(
        self,
        track_name: str = "Default Track",
        safety_car_probability: float = 0.3,  # 30% chance on DNF
        safety_car_duration: int = 6,  # laps
        delta_time_multiplier: float = 1.2,  # 120% of normal lap time
        safety_car_pace_multiplier: float = 1.4,  # 140% of normal lap time
    ):
        """
        Initialize safety car system.
        
        Args:
            track_name: Name of the track (affects probability)
            safety_car_probability: Chance of safety car on DNF
            safety_car_duration: Number of laps under safety car
            delta_time_multiplier: Multiplier for delta time
            safety_car_pace_multiplier: Multiplier for safety car pace
        """
        self.track_name = track_name
        self.safety_car_probability = safety_car_probability
        self.safety_car_duration = safety_car_duration
        self.delta_time_multiplier = delta_time_multiplier
        self.safety_car_pace_multiplier = safety_car_pace_multiplier
        
        # State
        self.active = False
        self.laps_remaining = 0
        self.deployment_lap = None
        self.total_deployments = 0
        
    def check_deployment(self, dnf_occurred: bool = False) -> bool:
        """
        Check if safety car should be deployed.
        
        Args:
            dnf_occurred: Whether a DNF just occurred
            
        Returns:
            True if safety car is deployed
        """
        if self.active:
            return False
        
        if dnf_occurred:
            if random.random() < self.safety_car_probability:
                self.deploy()
                return True
        
        return False
    
    def deploy(self):
        """Deploy the safety car."""
        self.active = True
        self.laps_remaining = self.safety_car_duration
        self.total_deployments += 1
        print(f"🚨 Safety Car deployed! Duration: {self.safety_car_duration} laps")
    
    def update(self, current_lap: int):
        """
        Update safety car state each lap.
        
        Args:
            current_lap: Current lap number
        """
        if self.active:
            self.laps_remaining -= 1
            if self.laps_remaining <= 0:
                self.withdraw()
    
    def withdraw(self):
        """Withdraw the safety car."""
        self.active = False
        self.laps_remaining = 0
        print("🏁 Safety Car withdrawn - Racing resumes!")
    
    def get_delta_time(self, normal_lap_time: float) -> float:
        """
        Get the delta time cars must run to under safety car.
        
        Args:
            normal_lap_time: Normal racing lap time
            
        Returns:
            Delta time in seconds
        """
        return normal_lap_time * self.delta_time_multiplier
    
    def get_safety_car_pace(self, normal_lap_time: float) -> float:
        """
        Get the safety car pace (when bunched up).
        
        Args:
            normal_lap_time: Normal racing lap time
            
        Returns:
            Safety car pace in seconds
        """
        return normal_lap_time * self.safety_car_pace_multiplier
    
    def should_pit(
        self,
        scheduled_pit_lap: int,
        current_lap: int,
        pit_window: int = 12
    ) -> bool:
        """
        Determine if a driver should pit during safety car.
        
        Based on F1-metrics: pit if within 12 laps of scheduled stop.
        
        Args:
            scheduled_pit_lap: When the driver planned to pit
            current_lap: Current lap number
            pit_window: How many laps before scheduled stop to pit
            
        Returns:
            True if driver should pit now
        """
        if not self.active:
            return False
        
        laps_until_scheduled = scheduled_pit_lap - current_lap
        return 0 < laps_until_scheduled <= pit_window
    
    def get_state(self) -> dict:
        """Get current safety car state."""
        return {
            "active": self.active,
            "laps_remaining": self.laps_remaining,
            "total_deployments": self.total_deployments,
        }


class DNFManager:
    """
    Manages driver DNFs (Did Not Finish) during races.
    
    Tracks:
    - Crash probability per driver
    - Mechanical failure probability per team
    - DNF history
    """
    
    def __init__(self):
        """Initialize DNF manager."""
        self.dnf_history: List[dict] = []
        self.active_dnfs = 0
    
    def check_dnf(
        self,
        driver_crash_prob: float,
        mechanical_failure_prob: float,
        current_lap: int,
        total_laps: int
    ) -> tuple[bool, str]:
        """
        Check if a driver should DNF this lap.
        
        Args:
            driver_crash_prob: Probability of crash per race
            mechanical_failure_prob: Probability of mechanical DNF per race
            current_lap: Current lap number
            total_laps: Total laps in race
            
        Returns:
            (dnf_occurred, reason) tuple
        """
        # Don't check DNF on lap 0 (race start)
        if current_lap == 0 or total_laps == 0:
            return False, ""
        
        # Convert per-race probability to per-lap probability
        # Use max to avoid division issues
        crash_prob_per_lap = driver_crash_prob / max(total_laps, 1)
        mechanical_prob_per_lap = mechanical_failure_prob / max(total_laps, 1)
        
        # Check for crash
        if random.random() < crash_prob_per_lap:
            self.active_dnfs += 1
            return True, "crash"
        
        # Check for mechanical failure
        if random.random() < mechanical_prob_per_lap:
            self.active_dnfs += 1
            return True, "mechanical"
        
        return False, ""
    
    def record_dnf(self, driver_id: str, lap: int, reason: str):
        """
        Record a DNF.
        
        Args:
            driver_id: Driver unique ID
            lap: Lap of DNF
            reason: Reason for DNF
        """
        self.dnf_history.append({
            "driver_id": driver_id,
            "lap": lap,
            "reason": reason,
        })
        print(f"❌ DNF: {driver_id} on lap {lap} ({reason})")
    
    def get_state(self) -> dict:
        """Get DNF statistics."""
        return {
            "total_dnfs": len(self.dnf_history),
            "active_dnfs": self.active_dnfs,
            "dnf_history": self.dnf_history,
        }
