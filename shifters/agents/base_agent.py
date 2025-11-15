"""Base Agent class for mobility simulation."""

from typing import Optional, Dict, Any, TYPE_CHECKING
from mesa import Agent
import uuid

if TYPE_CHECKING:
    from shifters.environment.track import Point3D


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
        # Calculate best lap time if any laps completed
        best_lap = min(self.lap_times) if self.lap_times else None

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
            "lap_times": self.lap_times,
            "best_lap_time": round(best_lap, 2) if best_lap else None,
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
    """Specialized agent for racing scenarios (Formula E, F1, MotoGP, etc.)."""

    def __init__(
        self,
        model,
        unique_id: str,
        name: Optional[str] = None,
        max_speed: float = 200.0,
        acceleration: float = 15.0,
        braking_rate: float = 25.0,
        cornering_skill: float = 1.0,
        **kwargs,
    ):
        """
        Initialize racing vehicle.

        Args:
            model: Simulation model
            unique_id: Unique identifier
            name: Display name
            max_speed: Maximum speed in m/s
            acceleration: Acceleration in m/s²
            braking_rate: Braking power in m/s²
            cornering_skill: Skill factor for corners (0.5-1.5, 1.0 = normal)
            **kwargs: Additional properties
        """
        super().__init__(
            model, unique_id, name, max_speed, acceleration, braking_rate, **kwargs
        )
        self.energy = 100.0  # Battery/fuel level
        self.pit_stops = 0
        self.cornering_skill = cornering_skill
        self.tire_wear = 0.0  # Tire degradation

    def _calculate_target_speed(self):
        """Calculate target speed with cornering skill adjustment."""
        super()._calculate_target_speed()
        # Skilled drivers can take corners faster
        if self.current_curvature > 0:
            self.target_speed *= self.cornering_skill

    def _move(self):
        """Move and consume energy, apply tire wear."""
        super()._move()

        # Energy consumption based on speed and acceleration
        time_step = getattr(self.model, "time_step", 0.1)
        speed_factor = self.speed / self.max_speed
        accel_factor = abs(self.speed - self.target_speed) / self.max_speed

        energy_consumption = (speed_factor * 0.01 + accel_factor * 0.005) * time_step
        self.energy = max(0, self.energy - energy_consumption)

        # Tire wear increases with cornering
        if self.current_curvature > 0:
            wear_rate = (self.speed / self.max_speed) * 0.001 * time_step
            self.tire_wear = min(100.0, self.tire_wear + wear_rate)

        # Reduced performance with tire wear
        if self.tire_wear > 50:
            wear_penalty = (self.tire_wear - 50) / 50  # 0 to 1
            self.cornering_skill = max(0.7, 1.0 - wear_penalty * 0.3)

    def pit_stop(self):
        """Perform pit stop to recharge/refuel and change tires."""
        self.energy = 100.0
        self.tire_wear = 0.0
        self.cornering_skill = max(self.cornering_skill, 1.0)
        self.pit_stops += 1
        self.speed = 0.0  # Stop during pit

    def get_state(self) -> Dict[str, Any]:
        """Get state including racing-specific data."""
        state = super().get_state()
        state.update(
            {
                "energy": round(self.energy, 2),
                "tire_wear": round(self.tire_wear, 2),
                "cornering_skill": round(self.cornering_skill, 2),
                "pit_stops": self.pit_stops,
            }
        )
        return state
