"""Base Agent class for mobility simulation."""

from typing import Optional, Dict, Any, TYPE_CHECKING
from mesa import Agent
import uuid

if TYPE_CHECKING:
    from shifters.environment.track import Point3D

try:
    from shifters.racing import TireSet, TireCompound, PitStopStrategy
    RACING_FEATURES_AVAILABLE = True
except ImportError:
    RACING_FEATURES_AVAILABLE = False


class MobilityAgent(Agent):
    """
    Base class for all moving agents in the simulation.

    Represents entities like vehicles, drones, or any mobile unit.
    """

    def __init__(
        self,
        model,
        unique_id: str,
        name: Optional[str] = None,
        max_speed: float = 100.0,
        acceleration: float = 10.0,
        braking_rate: float = 20.0,
        **kwargs,
    ):
        """
        Initialize a mobility agent.

        Args:
            model: The model instance this agent belongs to
            unique_id: Unique identifier for the agent
            name: Display name for the agent
            max_speed: Maximum speed the agent can reach (units/second)
            acceleration: Acceleration rate (units/second²)
            braking_rate: Braking/deceleration rate (units/second²)
            **kwargs: Additional custom properties
        """
        super().__init__(model)
        self.unique_id = unique_id
        self.name = name or f"Agent-{unique_id}"
        self.max_speed = max_speed
        self.acceleration = acceleration
        self.braking_rate = braking_rate

        # Movement state
        self.position = 0.0  # Current position on track (1D distance)
        self.speed = 0.0  # Current speed
        self.target_speed = max_speed  # Speed the agent is trying to reach
        self.lap = 0  # Current lap number
        self.finished = False

        # 3D position (if track has geometry)
        self.coordinates: Optional["Point3D"] = None
        self.elevation = 0.0
        self.current_banking = 0.0
        self.current_curvature = 0.0

        # Performance tracking
        self.distance_traveled = 0.0
        self.checkpoints_passed = []
        self.lap_times = []
        self.total_time = 0.0

        # Store additional properties
        self.properties = kwargs

    def step(self):
        """
        Execute one step of the agent's behavior.
        Override this in subclasses for custom behavior.
        """
        if not self.finished:
            self._update_track_geometry()
            self._calculate_target_speed()
            self._accelerate()
            self._move()

    def _update_track_geometry(self):
        """Update agent's track geometry information from current position."""
        if hasattr(self.model, "environment") and self.model.environment.track:
            track = self.model.environment.track
            self.coordinates = track.get_coordinates_at_position(self.position)
            self.elevation = track.get_elevation_at_position(self.position)
            self.current_banking = track.get_banking_at_position(self.position)
            self.current_curvature = track.get_curvature_at_position(self.position)

    def _calculate_target_speed(self):
        """Calculate target speed based on track geometry."""
        if hasattr(self.model, "environment") and self.model.environment.track:
            track = self.model.environment.track
            self.target_speed = track.get_recommended_speed_at_position(
                self.position, self.max_speed
            )
        else:
            self.target_speed = self.max_speed

    def _accelerate(self):
        """Accelerate or brake to reach target speed."""
        time_step = getattr(self.model, "time_step", 0.1)

        if self.speed < self.target_speed:
            # Accelerate
            self.speed = min(
                self.speed + self.acceleration * time_step, self.target_speed
            )
        elif self.speed > self.target_speed:
            # Brake
            self.speed = max(
                self.speed - self.braking_rate * time_step, self.target_speed
            )

    def _move(self):
        """Update position based on current speed."""
        time_step = getattr(self.model, "time_step", 0.1)
        movement = self.speed * time_step
        self.position += movement
        self.distance_traveled += movement

    def pass_checkpoint(self, checkpoint_id: str):
        """Record passing a checkpoint."""
        self.checkpoints_passed.append(
            {"checkpoint_id": checkpoint_id, "time": self.total_time}
        )

    def complete_lap(self, lap_time: float):
        """Record lap completion."""
        self.lap += 1
        self.lap_times.append(lap_time)
        self.position = 0.0  # Reset position for new lap

    def finish_race(self):
        """Mark agent as finished."""
        self.finished = True

    def get_state(self) -> Dict[str, Any]:
        """Get current agent state for display/logging."""
        state = {
            "id": self.unique_id,
            "name": self.name,
            "position": round(self.position, 2),
            "speed": round(self.speed, 2),
            "target_speed": round(self.target_speed, 2),
            "lap": self.lap,
            "finished": self.finished,
            "distance_traveled": round(self.distance_traveled, 2),
            "total_time": round(self.total_time, 2),
            "checkpoints": len(self.checkpoints_passed),
        }

        # Add 3D position if available
        if self.coordinates:
            state.update(
                {
                    "x": round(self.coordinates.x, 2),
                    "y": round(self.coordinates.y, 2),
                    "z": round(self.coordinates.z, 2),
                    "elevation": round(self.elevation, 2),
                    "banking": round(self.current_banking, 2),
                    "curvature": round(self.current_curvature, 2),
                }
            )

        return state


class RacingVehicle(MobilityAgent):
    """Specialized agent for racing scenarios with advanced tire and pit stop management."""

    def __init__(
        self,
        model,
        unique_id: str,
        name: Optional[str] = None,
        max_speed: float = 200.0,
        acceleration: float = 15.0,
        braking_rate: float = 25.0,
        cornering_skill: float = 1.0,
        starting_compound: Optional["TireCompound"] = None,
        enable_tire_management: bool = True,
        pit_stops_planned: int = 1,
        **kwargs,
    ):
        """
        Initialize racing vehicle with tire and pit stop management.

        Args:
            model: Simulation model
            unique_id: Unique identifier
            name: Display name
            max_speed: Maximum speed in m/s
            acceleration: Acceleration in m/s²
            braking_rate: Braking power in m/s²
            cornering_skill: Skill factor for corners (0.5-1.5, 1.0 = normal)
            starting_compound: Starting tire compound (defaults to MEDIUM)
            enable_tire_management: Enable advanced tire degradation system
            pit_stops_planned: Number of planned pit stops for strategy
            **kwargs: Additional properties
        """
        super().__init__(
            model, unique_id, name, max_speed, acceleration, braking_rate, **kwargs
        )
        self.energy = 100.0  # Battery/fuel level (percentage)
        self.pit_stops = 0
        self.cornering_skill = cornering_skill
        
        # F1Metrics-inspired fuel modeling
        self.fuel_mass = 110.0  # kg - full tank for race start
        self.fuel_consumption_rate = 1.8  # kg per lap (typical F1 consumption)
        self.fuel_effect_per_lap = 0.037  # seconds per lap of fuel (F1Metrics)
        
        # Driver consistency for lap-time variability (F1Metrics)
        # Range: 0.0 (very inconsistent) to 1.0 (perfectly consistent)
        self.consistency = kwargs.get("consistency", 0.8)
        
        # Legacy tire wear for backwards compatibility
        self.tire_wear = 0.0

        # Advanced tire management
        self.enable_tire_management = enable_tire_management and RACING_FEATURES_AVAILABLE
        
        if self.enable_tire_management:
            if starting_compound is None:
                from shifters.racing import TireCompound
                starting_compound = TireCompound.MEDIUM
            
            self.current_tires = TireSet(starting_compound)
            self.tire_history = []
            
            # Initialize pit stop strategy
            if hasattr(model, "environment") and model.environment.track:
                track = model.environment.track
                # Get circuit name for OpenF1 data
                circuit_name = kwargs.get("track_name")
                if not circuit_name and hasattr(track, "name"):
                    circuit_name = track.name
                
                self.pit_strategy = PitStopStrategy(
                    total_laps=track.num_laps,
                    track_length=track.length,
                    pit_lane_time_loss=20.0,
                    circuit_name=circuit_name,
                )
                # Use agent ID hash to vary pit strategies between cars
                import hashlib
                agent_seed = int(hashlib.md5(unique_id.encode()).hexdigest()[:8], 16) % 1000
                self.pit_strategy.plan_strategy(starting_compound, pit_stops_planned, seed_offset=agent_seed)
            else:
                self.pit_strategy = None
            
            # Initialize DRS and overtaking systems
            from shifters.racing import get_track_characteristics, DRSSystem, OvertakingModel
            
            # Try to get track name from environment
            track_name = kwargs.get("track_name", "default")
            if hasattr(model, "environment") and hasattr(model.environment, "track"):
                track_name = getattr(model.environment.track, "name", track_name)
            
            self.track_characteristics = get_track_characteristics(track_name)
            self.drs_system = DRSSystem(self.track_characteristics)
            self.overtaking_model = OvertakingModel(self.track_characteristics)
            self.drs_active = False
        else:
            self.current_tires = None
            self.tire_history = []
            self.pit_strategy = None
            self.drs_system = None
            self.overtaking_model = None
            self.drs_active = False
            self.pit_strategy = None

    def _calculate_target_speed(self):
        """Calculate target speed with tire performance and cornering skill."""
        super()._calculate_target_speed()
        
        # Apply tire performance multiplier
        if self.enable_tire_management and self.current_tires:
            is_wet = getattr(self.model.environment, "is_wet", False) if hasattr(self.model, "environment") else False
            tire_performance = self.current_tires.get_performance_multiplier(is_wet)
            self.target_speed *= tire_performance
        
        # Skilled drivers can take corners faster
        if self.current_curvature > 0:
            self.target_speed *= self.cornering_skill

    def _move(self):
        """Move with tire degradation and pit stop management."""
        # Handle pit stop if in pit lane
        if self.pit_strategy and self.pit_strategy.in_pit_lane:
            time_step = getattr(self.model, "time_step", 0.1)
            stop_complete, new_tires = self.pit_strategy.update_pit_stop(time_step)
            
            if stop_complete and new_tires:
                # Install new tires
                if self.current_tires:
                    self.tire_history.append({
                        "compound": self.current_tires.compound.value,
                        "laps_used": self.current_tires.laps_used,
                        "final_wear": self.current_tires.wear_percentage,
                    })
                self.current_tires = new_tires
                
                # Refuel/recharge
                self.energy = 100.0
                self.fuel_mass = 110.0
                self.tire_wear = 0.0
                self.pit_stops += 1
                
                # Reduced speed after pit exit
                self.speed = self.max_speed * 0.3
            else:
                # Slow movement through pit lane while stop in progress
                self.speed = self.max_speed * 0.3
                self.position += self.speed * time_step
            return
        
        # Normal movement
        old_position = self.position
        super()._move()
        distance_this_step = self.position - old_position
        
        # Energy consumption
        time_step = getattr(self.model, "time_step", 0.1)
        speed_factor = self.speed / self.max_speed
        accel_factor = abs(self.speed - self.target_speed) / self.max_speed
        energy_consumption = (speed_factor * 0.01 + accel_factor * 0.005) * time_step
        self.energy = max(0, self.energy - energy_consumption)
        
        # Fuel consumption (F1Metrics model)
        if hasattr(self.model.environment, "track"):
            track = self.model.environment.track
            lap_fraction = distance_this_step / track.length
            self.consume_fuel(lap_fraction)

        # Tire degradation
        if self.enable_tire_management and self.current_tires:
            track = self.model.environment.track if hasattr(self.model, "environment") else None
            if track:
                is_wet = getattr(self.model.environment, "is_wet", False)
                ambient_temp = getattr(self.model.environment, "temperature", 25.0)
                
                self.current_tires.update(
                    lap_distance=distance_this_step,
                    track_length=track.length,
                    speed=self.speed,
                    ambient_temp=ambient_temp,
                    is_wet=is_wet,
                )
                
                # Update legacy tire wear for compatibility
                self.tire_wear = self.current_tires.wear_percentage
        else:
            # Legacy tire wear
            if self.current_curvature > 0:
                wear_rate = (self.speed / self.max_speed) * 0.001 * time_step
                self.tire_wear = min(100.0, self.tire_wear + wear_rate)

        # Check if pit stop is needed
        if self.pit_strategy and not self.finished:
            should_pit = self.pit_strategy.should_pit(
                self.lap + 1,  # Next lap
                self.current_tires if self.current_tires else None,
                is_damaged=False,
            )
            
            if should_pit and not self.pit_strategy.in_pit_lane:
                self.pit_strategy.execute_pit_entry(self.lap + 1, self.current_tires)

    def pit_stop(self):
        """Legacy pit stop method for backwards compatibility."""
        self.energy = 100.0
        self.tire_wear = 0.0
        self.cornering_skill = max(self.cornering_skill, 1.0)
        self.pit_stops += 1
        self.speed = 0.0

        if self.enable_tire_management and self.current_tires:
            from shifters.racing import TireCompound
            # Default to medium compound
            self.current_tires = TireSet(TireCompound.MEDIUM)

    def calculate_fuel_effect(self) -> float:
        """
        Calculate lap time penalty from fuel weight (F1Metrics model).
        
        Returns:
            Time penalty in seconds based on remaining fuel
        """
        # F1Metrics: 0.037 seconds per lap of fuel weight
        laps_of_fuel_remaining = self.fuel_mass / max(self.fuel_consumption_rate, 0.1)
        return self.fuel_effect_per_lap * laps_of_fuel_remaining

    def consume_fuel(self, laps: float = 1.0) -> None:
        """
        Consume fuel for completed laps.
        
        Args:
            laps: Number of laps completed (can be fractional)
        """
        fuel_used = self.fuel_consumption_rate * laps
        self.fuel_mass = max(0.0, self.fuel_mass - fuel_used)
        
        # Update energy percentage
        initial_fuel = 110.0  # Full tank
        self.energy = (self.fuel_mass / initial_fuel) * 100.0

    def get_lap_time_variation(self) -> float:
        """
        Calculate lap-to-lap random variation based on driver consistency.
        
        Returns:
            Time variation in seconds (can be positive or negative)
        """
        import random
        
        # F1Metrics model: σ ranges from 0.2s (consistent) to 0.7s (inconsistent)
        # consistency = 1.0 → σ = 0.2s (very consistent driver)
        # consistency = 0.0 → σ = 0.7s (very inconsistent driver)
        std_dev = 0.7 - (self.consistency * 0.5)
        
        return random.normalvariate(0, std_dev)

    def check_drs_eligibility(self, gap_to_car_ahead: float) -> None:
        """
        Check and update DRS status based on gap to car ahead.
        
        Args:
            gap_to_car_ahead: Time gap to car ahead in seconds
        """
        if self.drs_system and self.enable_tire_management:
            self.drs_active = self.drs_system.is_drs_available(
                gap_to_car_ahead, self.lap
            )
    
    def get_drs_benefit(self) -> float:
        """
        Get current DRS lap time benefit.
        
        Returns:
            Time saved per lap in seconds (0 if DRS not active)
        """
        if self.drs_active and self.drs_system:
            return self.drs_system.get_drs_benefit()
        return 0.0
    
    def calculate_overtaking_probability(
        self,
        car_ahead: "RacingVehicle",
        gap_seconds: float,
    ) -> bool:
        """
        Determine if this car can overtake the car ahead.
        
        Args:
            car_ahead: The car being overtaken
            gap_seconds: Current time gap
        
        Returns:
            True if overtake should succeed
        """
        if not self.overtaking_model or not self.enable_tire_management:
            return False
        
        # Calculate pace advantage (simplified - could use actual lap times)
        my_performance = 1.0
        their_performance = 1.0
        
        if self.current_tires and car_ahead.current_tires:
            my_grip = self.current_tires.get_grip_level()
            their_grip = car_ahead.current_tires.get_grip_level()
            tire_advantage = (my_grip - their_grip) * 2.0  # Convert to seconds
        else:
            tire_advantage = 0.0
        
        # Fuel advantage
        my_fuel_penalty = self.calculate_fuel_effect()
        their_fuel_penalty = car_ahead.calculate_fuel_effect()
        fuel_advantage = their_fuel_penalty - my_fuel_penalty
        
        # Total pace advantage
        pace_advantage = tire_advantage + fuel_advantage
        
        return self.overtaking_model.can_overtake(
            pace_advantage=pace_advantage,
            gap_seconds=gap_seconds,
            has_drs=self.drs_active,
            tire_advantage=tire_advantage,
        )

    def get_state(self) -> Dict[str, Any]:
        """Get state including racing-specific data."""
        state = super().get_state()
        state.update(
            {
                "energy": round(self.energy, 2),
                "tire_wear": round(self.tire_wear, 2),
                "cornering_skill": round(self.cornering_skill, 2),
                "pit_stops": self.pit_stops,
                "fuel_mass": round(self.fuel_mass, 2),
                "fuel_effect": round(self.calculate_fuel_effect(), 3),
                "consistency": round(self.consistency, 2),
                "drs_active": self.drs_active if self.enable_tire_management else False,
            }
        )
        
        # Add tire management data
        if self.enable_tire_management and self.current_tires:
            state["tire_data"] = self.current_tires.get_state()
        
        # Add pit strategy data
        if self.pit_strategy:
            state["pit_strategy"] = self.pit_strategy.get_strategy_info()
        
        return state
