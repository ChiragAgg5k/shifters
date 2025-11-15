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
        mass: float = 798.0,  # F1 car mass in kg (with driver)
        drag_coefficient: float = 0.7,  # Cd for F1 car
        frontal_area: float = 1.5,  # m² frontal area
        downforce_coefficient: float = 3.0,  # Cl for F1 car
        qualifying_position: int = 1,  # Grid position (1-22)
        lap_time_std: float = 0.3,  # Lap-time variability (0.2=metronomic, 0.7=inconsistent)
        dnf_probability: float = 0.02,  # Probability of DNF per race
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
            mass: Vehicle mass in kg
            drag_coefficient: Aerodynamic drag coefficient (Cd)
            frontal_area: Frontal area in m²
            downforce_coefficient: Downforce coefficient (Cl)
            **kwargs: Additional properties
        """
        super().__init__(
            model, unique_id, name, max_speed, acceleration, braking_rate, **kwargs
        )
        # Racing-specific attributes
        self.energy = 100.0  # Battery/fuel level
        self.pit_stops = 0
        self.cornering_skill = cornering_skill
        self.tire_wear = 0.0  # Tire degradation
        self.tire_temperature = 80.0  # Optimal tire temp (°C)
        
        # Physics attributes
        self.mass = mass
        self.drag_coefficient = drag_coefficient
        self.frontal_area = frontal_area
        self.downforce_coefficient = downforce_coefficient
        self.drs_active = False  # Drag Reduction System
        self.in_slipstream = False  # Following another car
        self.damage_level = 0.0  # 0-100% damage
        
        # F1-metrics inspired parameters
        self.qualifying_position = qualifying_position
        self.lap_time_std = lap_time_std  # Driver consistency (lower = more consistent)
        self.dnf_probability = dnf_probability
        self.grid_penalty = (qualifying_position - 1) * 0.25  # 0.25s per grid position
        self.start_bonus = 0.0  # Set based on historical start performance
        
        # Performance tracking
        self.overtakes = 0
        self.positions_gained = 0
        self.current_position = qualifying_position  # Race position
        self.overtaken_this_lap = False  # Flag for time penalty when overtaken
        self.last_dnf_check_lap = -1  # Track which lap we last checked for DNF
        self.just_crossed_line = False  # Flag to prevent visual teleporting

    def _calculate_target_speed(self):
        """Calculate target speed with cornering skill, downforce, and weather."""
        super()._calculate_target_speed()
        
        # Get weather conditions
        weather = getattr(self.model.environment, 'weather', 'clear') if hasattr(self.model, 'environment') else 'clear'
        track_temp = getattr(self.model.environment, 'temperature', 25.0) if hasattr(self.model, 'environment') else 25.0
        
        # Weather effects on grip
        grip_multiplier = 1.0
        if weather == 'rain':
            grip_multiplier = 0.7  # 30% less grip in rain
        elif weather == 'wet':
            grip_multiplier = 0.85  # 15% less grip on wet track
        
        # Tire temperature effects (optimal: 80-100°C)
        if self.tire_temperature < 60:
            grip_multiplier *= 0.9  # Cold tires
        elif self.tire_temperature > 110:
            grip_multiplier *= 0.85  # Overheated tires
        
        # Downforce increases cornering speed at high speeds
        if self.current_curvature > 0:
            # Base cornering skill
            skill_factor = self.cornering_skill * grip_multiplier
            
            # Downforce effect (more effective at higher speeds)
            speed_ratio = self.speed / self.max_speed
            downforce_factor = 1.0 + (self.downforce_coefficient * 0.1 * speed_ratio)
            
            # Damage reduces cornering ability
            damage_factor = 1.0 - (self.damage_level * 0.003)  # Up to 30% reduction at 100% damage
            
            self.target_speed *= skill_factor * downforce_factor * damage_factor

    def _move(self):
        """Move with advanced physics: drag, downforce, slipstream, energy, tire wear."""
        import random
        time_step = getattr(self.model, "time_step", 0.1)
        
        # Add lap-time variability (driver consistency)
        # This creates natural variation that enables overtaking
        lap_time_variation = random.gauss(0, self.lap_time_std)
        
        # Time penalty if overtaken this lap (0.4s for taking inferior line)
        overtake_penalty = 0.4 if self.overtaken_this_lap else 0.0
        self.overtaken_this_lap = False  # Reset for next lap
        
        # Calculate aerodynamic drag force: F_drag = 0.5 * ρ * Cd * A * v²
        air_density = 1.225  # kg/m³ at sea level
        drag_force = 0.5 * air_density * self.drag_coefficient * self.frontal_area * (self.speed ** 2)
        
        # DRS reduces drag by ~25% on straights
        if self.drs_active and self.current_curvature == 0:
            drag_force *= 0.75
        
        # Slipstream reduces drag by ~30% when following another car
        if self.in_slipstream:
            drag_force *= 0.70
        
        # Calculate downforce: F_downforce = 0.5 * ρ * Cl * A * v²
        downforce = 0.5 * air_density * self.downforce_coefficient * self.frontal_area * (self.speed ** 2)
        
        # Drag reduces acceleration
        drag_deceleration = drag_force / self.mass
        
        # Apply acceleration with drag
        if self.speed < self.target_speed:
            net_acceleration = self.acceleration - drag_deceleration
            self.speed = min(self.speed + net_acceleration * time_step, self.target_speed)
        elif self.speed > self.target_speed:
            # Braking with drag assistance
            net_braking = self.braking_rate + drag_deceleration
            self.speed = max(self.speed - net_braking * time_step, self.target_speed)
        else:
            # Maintain speed, but drag still affects it
            self.speed = max(0, self.speed - drag_deceleration * time_step)
        
        # Update position with lap-time variation and penalties
        base_movement = self.speed * time_step
        
        # Apply lap-time variation (convert to distance: negative variation = slower = less distance)
        variation_distance = -lap_time_variation * (self.speed / 10.0)  # Scale appropriately
        
        # Apply overtake penalty (convert time to distance)
        penalty_distance = -overtake_penalty * (self.speed / 10.0) if overtake_penalty > 0 else 0.0
        
        movement = base_movement + variation_distance + penalty_distance
        movement = max(0, movement)  # Ensure non-negative
        
        old_position = self.position
        self.position += movement
        self.distance_traveled += movement
        
        # Normalize position continuously for circuit tracks to prevent visual jumps
        self.just_crossed_line = False
        if hasattr(self.model, 'environment') and hasattr(self.model.environment, 'track'):
            track = self.model.environment.track
            if track.track_type == "circuit" and self.position >= track.length:
                self.position = self.position % track.length
                self.just_crossed_line = True  # Mark that we crossed the finish line
        
        # Energy consumption (speed, acceleration, and drag)
        speed_factor = self.speed / self.max_speed
        accel_factor = abs(self.speed - self.target_speed) / self.max_speed
        drag_factor = drag_force / 1000.0  # Normalize
        
        energy_consumption = (speed_factor * 0.01 + accel_factor * 0.005 + drag_factor * 0.002) * time_step
        self.energy = max(0, self.energy - energy_consumption)
        
        # Tire wear (cornering, braking, high speed, and dirty air)
        if self.current_curvature > 0:
            wear_rate = (self.speed / self.max_speed) * 0.001 * time_step
            # Dirty air increases tire wear by 10% (F1-metrics inspired)
            if self.in_slipstream:
                wear_rate *= 1.1
            self.tire_wear = min(100.0, self.tire_wear + wear_rate)
        
        # Hard braking increases tire wear
        if self.speed > self.target_speed:
            brake_wear = accel_factor * 0.0005 * time_step
            self.tire_wear = min(100.0, self.tire_wear + brake_wear)
        
        # Tire temperature management
        weather = getattr(self.model.environment, 'weather', 'clear') if hasattr(self.model, 'environment') else 'clear'
        ambient_temp = getattr(self.model.environment, 'temperature', 25.0) if hasattr(self.model, 'environment') else 25.0
        
        # Tires heat up with use
        if self.speed > 0:
            heat_rate = (self.speed / self.max_speed) * 2.0 * time_step
            if self.current_curvature > 0:
                heat_rate *= 1.5  # Cornering generates more heat
            self.tire_temperature = min(120.0, self.tire_temperature + heat_rate)
        
        # Tires cool down naturally
        cooling_rate = (self.tire_temperature - ambient_temp) * 0.01 * time_step
        if weather == 'rain':
            cooling_rate *= 2.0  # Rain cools tires faster
        self.tire_temperature = max(ambient_temp, self.tire_temperature - cooling_rate)
        
        # Reduced performance with tire wear
        if self.tire_wear > 50:
            wear_penalty = (self.tire_wear - 50) / 50  # 0 to 1
            self.cornering_skill = max(0.7, 1.0 - wear_penalty * 0.3)
        
        # Damage accumulation (random events, hard cornering)
        if self.current_curvature > 0 and self.speed > self.max_speed * 0.9:
            import random
            if random.random() < 0.0001:  # 0.01% chance per step
                self.damage_level = min(100.0, self.damage_level + random.uniform(1, 5))

    def activate_drs(self):
        """Activate Drag Reduction System (only on straights)."""
        if self.current_curvature == 0:
            self.drs_active = True
    
    def deactivate_drs(self):
        """Deactivate DRS (automatically in corners)."""
        self.drs_active = False
    
    def check_slipstream(self, other_agents: list):
        """Check if this vehicle is in slipstream of another."""
        self.in_slipstream = False
        slipstream_distance = 50.0  # meters
        
        for agent in other_agents:
            if agent.unique_id != self.unique_id:
                # Check if agent is ahead and within slipstream range
                distance_ahead = agent.position - self.position
                if 0 < distance_ahead < slipstream_distance:
                    # Check if on same lap
                    if agent.lap == self.lap:
                        self.in_slipstream = True
                        break
    
    def can_overtake(self, car_ahead, overtaking_threshold: float = 1.2) -> bool:
        """
        Check if this car can overtake the car ahead based on F1-metrics model.
        
        Args:
            car_ahead: The RacingVehicle ahead
            overtaking_threshold: Time advantage needed to overtake (seconds)
                                 Default 1.2s based on F1-metrics research
        
        Returns:
            True if overtake is possible this lap
        """
        if not isinstance(car_ahead, RacingVehicle):
            return False
        
        # Calculate net pace advantage (accounting for DRS)
        pace_advantage = car_ahead.speed - self.speed
        
        # DRS gives ~0.4s advantage per lap
        if self.drs_active:
            pace_advantage += 0.4 * (self.max_speed / 100.0)  # Convert to speed
        
        # Straight-line speed difference affects overtaking
        # 0.2s threshold change per 10 km/h difference
        speed_diff_kmh = (self.max_speed - car_ahead.max_speed) * 3.6  # m/s to km/h
        adjusted_threshold = overtaking_threshold - (speed_diff_kmh / 10.0) * 0.2
        
        # Convert pace advantage to time (rough approximation)
        time_advantage = pace_advantage * 0.1  # Scale factor
        
        return time_advantage >= adjusted_threshold
    
    def pit_stop(self, base_pit_duration: float = 2.5):
        """
        Perform pit stop with realistic time variability.
        
        Uses log-logistic distribution based on F1-metrics research:
        - 50% of stops within 1s of best time
        - 80% within 2s
        - 90% within 4s
        - Heavy tail for problem stops
        """
        import numpy as np
        
        # Log-logistic distribution parameters (fitted to F1 data)
        # alpha (scale) and beta (shape) chosen to match F1 pit-stop distribution
        alpha = 0.8  # Scale parameter
        beta = 3.0   # Shape parameter (controls tail heaviness)
        
        # Generate random pit-stop delay using log-logistic distribution
        u = np.random.uniform(0, 1)
        pit_delay = alpha * ((u / (1 - u)) ** (1 / beta))
        
        # Total pit time = base time + random delay
        actual_pit_duration = base_pit_duration + pit_delay
        
        # Perform pit-stop actions
        self.energy = 100.0
        self.tire_wear = 0.0
        self.tire_temperature = 60.0  # Fresh cold tires
        self.cornering_skill = max(self.cornering_skill, 1.0)
        self.damage_level = max(0.0, self.damage_level - 50.0)  # Partial repairs
        self.pit_stops += 1
        self.speed = 0.0  # Stop during pit
        self.total_time += actual_pit_duration  # Add actual pit stop time
        
        return actual_pit_duration

    def get_state(self) -> Dict[str, Any]:
        """Get state including racing-specific data."""
        state = super().get_state()
        state.update(
            {
                "energy": round(self.energy, 2),
                "tire_wear": round(self.tire_wear, 2),
                "tire_temperature": round(self.tire_temperature, 1),
                "cornering_skill": round(self.cornering_skill, 2),
                "pit_stops": self.pit_stops,
                "drs_active": self.drs_active,
                "in_slipstream": self.in_slipstream,
                "damage_level": round(self.damage_level, 1),
                "overtakes": self.overtakes,
                "current_position": self.current_position,
                "lap_time_std": round(self.lap_time_std, 2),
                "qualifying_position": self.qualifying_position,
                "just_crossed_line": self.just_crossed_line,
            }
        )
        return state
