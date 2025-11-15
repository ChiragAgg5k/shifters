"""Base Agent class for mobility simulation."""

from typing import Optional, Dict, Any, TYPE_CHECKING
from mesa import Agent
import uuid
import math

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
        # Advanced vehicle dynamics settings (RL adjustable)
        differential_preload: float = 50.0,  # Nm (0-100, affects corner exit traction)
        engine_braking: float = 0.3,  # 0-1 (fraction of max deceleration from engine)
        brake_balance: float = 0.56,  # 0-1 (0=all rear, 1=all front, optimal ~0.56)
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
        
        # Advanced vehicle dynamics (RL adjustable parameters)
        self.differential_preload = differential_preload  # Nm, affects torque distribution
        self.engine_braking = engine_braking  # 0-1, engine deceleration contribution
        self.brake_balance = brake_balance  # 0-1, front/rear brake distribution
        
        # Vehicle geometry for physics calculations
        self.wheelbase = 3.6  # meters (F1 typical)
        self.track_width_front = 1.8  # meters
        self.track_width_rear = 1.6  # meters
        self.cg_height = 0.35  # meters, center of gravity height
        self.weight_distribution = 0.46  # Front weight distribution (46% front, 54% rear)
        
        # Dynamic state tracking for differential and braking
        self.wheel_speed_left = 0.0  # m/s
        self.wheel_speed_right = 0.0  # m/s
        self.lateral_load_transfer = 0.0  # N
        self.longitudinal_load_transfer = 0.0  # N
        self.brake_temp_front = 400.0  # °C (optimal 400-800°C)
        self.brake_temp_rear = 400.0  # °C
        
        # Performance tracking
        self.overtakes = 0
        self.positions_gained = 0
        self.current_position = qualifying_position  # Race position
        self.overtaken_this_lap = False  # Flag for time penalty when overtaken
        self.last_dnf_check_lap = -1  # Track which lap we last checked for DNF
        self.just_crossed_line = False  # Flag to prevent visual teleporting
        
        # RL reward/loss tracking
        self.traction_efficiency = 1.0  # 0-1, how well power is being used
        self.braking_efficiency = 1.0  # 0-1, how optimal braking is
        self.corner_exit_quality = 1.0  # 0-1, corner exit performance

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
        tire_temp_factor = 1.0
        if self.tire_temperature < 60:
            tire_temp_factor = 0.9  # Cold tires
        elif self.tire_temperature > 110:
            tire_temp_factor = 0.85  # Overheated tires
        
        grip_multiplier *= tire_temp_factor
        
        # Downforce increases cornering speed at high speeds
        if self.current_curvature > 0:
            # Base cornering skill
            skill_factor = self.cornering_skill * grip_multiplier
            
            # Calculate downforce at current speed: F_df = 0.5 * ρ * Cl * A * v²
            air_density = 1.225  # kg/m³
            downforce = 0.5 * air_density * self.downforce_coefficient * self.frontal_area * (self.speed ** 2)
            
            # Total normal force = weight + downforce
            gravity = 9.81  # m/s²
            weight_force = self.mass * gravity
            total_normal_force = weight_force + downforce
            
            # Tire load sensitivity: μ_effective = μ_peak * (1 - load_sensitivity * (N/N_ref - 1))
            # F1 tires have ~3% reduction per 1000N above reference load
            reference_load = weight_force
            load_sensitivity = 0.00003  # per Newton
            load_ratio = total_normal_force / reference_load
            tire_load_factor = 1.0 - load_sensitivity * (total_normal_force - reference_load)
            tire_load_factor = max(0.85, min(1.0, tire_load_factor))  # Clamp 0.85-1.0
            
            # Maximum cornering speed: v = sqrt((F_friction_max * r) / m)
            # F_friction_max = μ * N_total * tire_load_factor
            friction_coefficient = 1.4 * grip_multiplier * tire_load_factor  # Racing slicks
            max_lateral_force = friction_coefficient * total_normal_force
            
            # Centripetal force requirement: F_c = m * v² / r
            # Solving for v: v = sqrt((F_friction * r) / m)
            if self.current_curvature > 0:
                corner_radius = 1.0 / self.current_curvature if self.current_curvature > 0 else 1000.0
                max_corner_speed = math.sqrt((max_lateral_force * corner_radius) / self.mass)
                
                # Apply skill and damage factors
                damage_factor = 1.0 - (self.damage_level * 0.003)  # Up to 30% reduction at 100% damage
                
                # Calculate ideal target speed
                self.target_speed = min(self.target_speed, max_corner_speed * skill_factor * damage_factor)

    def _calculate_load_transfer(self, lateral_accel: float, longitudinal_accel: float) -> Dict[str, float]:
        """
        Calculate load transfer under acceleration, braking, and cornering.
        Critical for differential and brake balance optimization.
        
        Args:
            lateral_accel: Lateral acceleration in m/s² (cornering)
            longitudinal_accel: Longitudinal acceleration in m/s² (+accel, -braking)
        
        Returns:
            Dict with wheel loads (N) for FL, FR, RL, RR
        """
        gravity = 9.81
        weight = self.mass * gravity
        
        # Static weight distribution
        front_static = weight * self.weight_distribution
        rear_static = weight * (1 - self.weight_distribution)
        
        # Longitudinal load transfer: ΔF_z = (m * a_x * h) / L
        # where h = CG height, L = wheelbase
        long_transfer = (self.mass * longitudinal_accel * self.cg_height) / self.wheelbase
        
        # Lateral load transfer front: ΔF_z_f = (m_f * a_y * h) / t_f
        # where m_f = front mass, t_f = front track width
        front_mass = self.mass * self.weight_distribution
        rear_mass = self.mass * (1 - self.weight_distribution)
        
        lat_transfer_front = (front_mass * lateral_accel * self.cg_height) / self.track_width_front
        lat_transfer_rear = (rear_mass * lateral_accel * self.cg_height) / self.track_width_rear
        
        # Calculate individual wheel loads
        # Longitudinal: accel transfers to rear, braking to front
        front_load = front_static - long_transfer
        rear_load = rear_static + long_transfer
        
        # Lateral: outside wheels gain load, inside wheels lose load
        loads = {
            'FL': (front_load / 2) + lat_transfer_front if lateral_accel > 0 else (front_load / 2) - lat_transfer_front,
            'FR': (front_load / 2) - lat_transfer_front if lateral_accel > 0 else (front_load / 2) + lat_transfer_front,
            'RL': (rear_load / 2) + lat_transfer_rear if lateral_accel > 0 else (rear_load / 2) - lat_transfer_rear,
            'RR': (rear_load / 2) - lat_transfer_rear if lateral_accel > 0 else (rear_load / 2) + lat_transfer_rear,
        }
        
        # Store for other calculations
        self.lateral_load_transfer = abs(lat_transfer_front + lat_transfer_rear)
        self.longitudinal_load_transfer = abs(long_transfer)
        
        return loads
    
    def _calculate_differential_effect(self, corner_radius: float, speed: float) -> float:
        """
        Calculate differential effect on corner exit traction.
        
        Limited-slip differential (LSD) with preload affects how power is distributed
        between inside and outside wheels. Higher preload = more locked = better 
        traction but increased understeer.
        
        Args:
            corner_radius: Radius of corner (meters)
            speed: Current speed (m/s)
        
        Returns:
            Traction efficiency multiplier (0-1)
        """
        if corner_radius == 0 or corner_radius > 1000:  # Straight line
            return 1.0
        
        # Calculate required speed difference between inside and outside wheels
        # v_outer / v_inner = (R + t/2) / (R - t/2)
        track_width = self.track_width_rear  # Differential on rear axle
        speed_ratio = (corner_radius + track_width/2) / (corner_radius - track_width/2)
        speed_diff_required = speed * (speed_ratio - 1)
        
        # Preload creates locking torque: T_lock = preload + K * T_input
        # Higher preload resists speed difference
        # Normalize preload 0-100 to locking coefficient 0-1
        locking_coefficient = self.differential_preload / 100.0
        
        # Allowed slip: higher preload = less slip = worse for tight corners, better for exit
        max_allowed_slip = 5.0 * (1.0 - locking_coefficient)  # m/s
        
        # Calculate traction loss from wheel slip
        if speed_diff_required > max_allowed_slip:
            # Inside wheel spinning or outside wheel dragging
            slip_excess = speed_diff_required - max_allowed_slip
            traction_loss = min(0.3, slip_excess / 10.0)  # Up to 30% loss
            efficiency = 1.0 - traction_loss
        else:
            # Optimal - diff allows necessary slip
            efficiency = 1.0
        
        # Corner exit: higher preload improves traction (locks diff, prevents inside spin)
        # This is the key RL optimization - balance corner entry vs exit
        if self.speed < self.target_speed:  # Accelerating (corner exit)
            exit_bonus = locking_coefficient * 0.15  # Up to 15% better traction
            efficiency = min(1.0, efficiency + exit_bonus)
        
        self.traction_efficiency = efficiency
        return efficiency
    
    def _calculate_engine_braking(self, speed_diff: float) -> float:
        """
        Calculate engine braking contribution to deceleration.
        
        Engine braking occurs when throttle is released. Setting affects:
        - Rear stability (high = more rear braking = potential oversteer)
        - Brake wear (high engine braking = less brake usage)
        - Corner entry balance
        
        Args:
            speed_diff: Target speed - current speed (negative when slowing)
        
        Returns:
            Additional deceleration in m/s²
        """
        if speed_diff >= 0:  # Not braking
            return 0.0
        
        # Engine braking strength depends on RPM (approximated by speed)
        # Higher speed = higher RPM = more engine braking
        speed_ratio = self.speed / self.max_speed
        rpm_factor = 0.5 + (speed_ratio * 0.5)  # 0.5-1.0 based on speed
        
        # Maximum engine braking ~6-8 m/s² for F1
        max_engine_brake = 7.0  # m/s²
        
        # Apply driver setting (0-1)
        engine_brake_force = max_engine_brake * self.engine_braking * rpm_factor
        
        # Engine braking only affects rear wheels (RWD)
        # This creates potential oversteer on corner entry
        # RL can optimize: high for stability, low for rotation
        
        return engine_brake_force
    
    def _calculate_brake_distribution(self, total_brake_force: float, loads: Dict[str, float]) -> Dict[str, float]:
        """
        Calculate front/rear brake force distribution based on brake balance setting.
        
        Optimal brake balance changes with:
        - Speed (aero load affects weight distribution)
        - Fuel load (weight distribution)
        - Tire condition
        - Corner entry requirements
        
        Args:
            total_brake_force: Total braking force in N
            loads: Wheel loads from load transfer calculation
        
        Returns:
            Dict with brake forces for front and rear axles
        """
        # Brake balance: 0 = all rear, 1 = all front
        # Optimal is ~56-60% front for F1 at high speed
        front_brake = total_brake_force * self.brake_balance
        rear_brake = total_brake_force * (1.0 - self.brake_balance)
        
        # Calculate maximum available friction force per axle
        # F_brake_max = μ * N (limited by tire grip)
        friction_coeff = 1.4  # Racing tire peak
        
        front_load = loads['FL'] + loads['FR']
        rear_load = loads['RL'] + loads['RR']
        
        max_front_brake = friction_coeff * front_load
        max_rear_brake = friction_coeff * rear_load
        
        # Check for lock-up potential (RL optimization target)
        front_lock_margin = (max_front_brake - front_brake) / max_front_brake
        rear_lock_margin = (max_rear_brake - rear_brake) / max_rear_brake
        
        # Efficiency: closer to limit = better, but lock-up = very bad
        # Optimal margin: 5-10%
        if front_lock_margin < 0:  # Front locking
            front_brake = max_front_brake * 0.95  # Limit to 95%
            braking_efficiency = 0.7  # Heavy penalty
        elif front_lock_margin < 0.05:
            braking_efficiency = 1.0  # Perfect
        else:
            braking_efficiency = 0.9  # Underutilizing brakes
        
        if rear_lock_margin < 0:  # Rear locking (causes instability)
            rear_brake = max_rear_brake * 0.95
            braking_efficiency *= 0.6  # Severe penalty (spin risk)
        elif rear_lock_margin < 0.05:
            braking_efficiency *= 1.0
        else:
            braking_efficiency *= 0.95
        
        self.braking_efficiency = braking_efficiency
        
        # Update brake temperatures (affects fade)
        # Higher brake force = more heat generation
        heat_gen_front = front_brake / 10000.0  # Simplified
        heat_gen_rear = rear_brake / 10000.0
        
        self.brake_temp_front = min(900.0, self.brake_temp_front + heat_gen_front)
        self.brake_temp_rear = min(900.0, self.brake_temp_rear + heat_gen_rear)
        
        # Brake fade if too hot (>800°C)
        if self.brake_temp_front > 800:
            fade_factor = 1.0 - ((self.brake_temp_front - 800) / 200.0)
            front_brake *= max(0.7, fade_factor)
        if self.brake_temp_rear > 800:
            fade_factor = 1.0 - ((self.brake_temp_rear - 800) / 200.0)
            rear_brake *= max(0.7, fade_factor)
        
        return {
            'front': front_brake,
            'rear': rear_brake,
            'efficiency': braking_efficiency,
            'front_lock_margin': front_lock_margin,
            'rear_lock_margin': rear_lock_margin,
        }

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
        
        # Calculate current accelerations for load transfer
        speed_diff = self.target_speed - self.speed
        
        # Estimate lateral acceleration from cornering
        lateral_accel = 0.0
        corner_radius = 0.0
        if self.current_curvature > 0:
            corner_radius = 1.0 / self.current_curvature
            lateral_accel = (self.speed ** 2) / corner_radius if corner_radius > 0 else 0.0
        
        # Estimate longitudinal acceleration (simplified)
        if speed_diff > 0:  # Accelerating
            longitudinal_accel = self.acceleration - drag_deceleration
        else:  # Braking
            longitudinal_accel = -(self.braking_rate + drag_deceleration)
        
        # Calculate load transfer for brake balance and differential
        wheel_loads = self._calculate_load_transfer(lateral_accel, longitudinal_accel)
        
        # Apply differential effect on acceleration (corner exit traction)
        diff_efficiency = self._calculate_differential_effect(corner_radius, self.speed)
        
        # Apply acceleration with drag and differential effects
        if self.speed < self.target_speed:
            # Accelerating - apply differential traction efficiency
            net_acceleration = (self.acceleration * diff_efficiency) - drag_deceleration
            self.speed = min(self.speed + net_acceleration * time_step, self.target_speed)
            
            # Track corner exit quality for RL reward
            if self.current_curvature > 0:
                self.corner_exit_quality = diff_efficiency
        
        elif self.speed > self.target_speed:
            # Braking - apply engine braking and brake balance
            engine_brake_decel = self._calculate_engine_braking(speed_diff)
            
            # Calculate total required braking force
            required_decel = abs(speed_diff) / time_step if time_step > 0 else self.braking_rate
            required_decel = min(required_decel, self.braking_rate)
            
            # Brake force in Newtons
            total_brake_force_needed = (required_decel - drag_deceleration - engine_brake_decel) * self.mass
            total_brake_force_needed = max(0, total_brake_force_needed)
            
            # Distribute braking force based on brake balance
            brake_dist = self._calculate_brake_distribution(total_brake_force_needed, wheel_loads)
            
            # Apply total deceleration
            total_decel = drag_deceleration + engine_brake_decel + (brake_dist['front'] + brake_dist['rear']) / self.mass
            
            # Penalize if braking inefficiently (RL learning signal)
            total_decel *= brake_dist['efficiency']
            
            self.speed = max(self.speed - total_decel * time_step, self.target_speed)
        
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
                # Advanced dynamics settings (RL adjustable)
                "differential_preload": round(self.differential_preload, 1),
                "engine_braking": round(self.engine_braking, 2),
                "brake_balance": round(self.brake_balance, 2),
                # Brake temperatures
                "brake_temp_front": round(self.brake_temp_front, 1),
                "brake_temp_rear": round(self.brake_temp_rear, 1),
                # RL metrics (reward/loss signals)
                "traction_efficiency": round(self.traction_efficiency, 3),
                "braking_efficiency": round(self.braking_efficiency, 3),
                "corner_exit_quality": round(self.corner_exit_quality, 3),
                "lateral_load_transfer": round(self.lateral_load_transfer, 1),
                "longitudinal_load_transfer": round(self.longitudinal_load_transfer, 1),
            }
        )
        return state
    
    def adjust_differential(self, delta: float):
        """
        Adjust differential preload setting.
        For RL agent control - can be called per corner or per lap.
        
        Args:
            delta: Change in preload (-10 to +10 Nm typical per adjustment)
        """
        self.differential_preload = max(0.0, min(100.0, self.differential_preload + delta))
    
    def adjust_engine_braking(self, delta: float):
        """
        Adjust engine braking setting.
        For RL agent control.
        
        Args:
            delta: Change in engine braking (-0.1 to +0.1 typical)
        """
        self.engine_braking = max(0.0, min(1.0, self.engine_braking + delta))
    
    def adjust_brake_balance(self, delta: float):
        """
        Adjust brake balance setting.
        For RL agent control - critical for corner entry optimization.
        
        Args:
            delta: Change in brake balance (-0.02 to +0.02 typical, 2% shifts)
        """
        self.brake_balance = max(0.0, min(1.0, self.brake_balance + delta))
    
    def get_rl_state_vector(self) -> list:
        """
        Get state vector for RL training.
        Normalized values suitable for neural network input.
        
        Returns:
            List of normalized state values
        """
        return [
            self.speed / self.max_speed,  # Normalized speed
            self.tire_wear / 100.0,  # Normalized wear
            (self.tire_temperature - 60) / 60.0,  # Normalized temp (60-120°C range)
            self.energy / 100.0,  # Normalized energy
            self.current_curvature,  # Track curvature (already small)
            self.differential_preload / 100.0,  # Normalized diff setting
            self.engine_braking,  # Already 0-1
            self.brake_balance,  # Already 0-1
            self.traction_efficiency,  # 0-1
            self.braking_efficiency,  # 0-1
            (self.brake_temp_front - 400) / 500.0,  # Normalized brake temp
            (self.brake_temp_rear - 400) / 500.0,  # Normalized brake temp
            self.damage_level / 100.0,  # Normalized damage
        ]
    
    def get_rl_reward(self) -> float:
        """
        Calculate reward for RL training.
        
        Reward components:
        - Lap time improvement (primary)
        - Efficiency metrics (secondary)
        - Penalties for mistakes
        
        Returns:
            Scalar reward value
        """
        reward = 0.0
        
        # Primary: Speed/progress reward
        reward += self.speed / self.max_speed * 10.0
        
        # Traction efficiency (corner exit)
        reward += self.traction_efficiency * 2.0
        
        # Braking efficiency
        reward += self.braking_efficiency * 2.0
        
        # Penalties
        if self.tire_wear > 80:
            reward -= 2.0  # Heavy tire wear penalty
        
        if self.brake_temp_front > 850 or self.brake_temp_rear > 850:
            reward -= 3.0  # Brake overheating penalty
        
        if self.damage_level > 50:
            reward -= 5.0  # Damage penalty
        
        # Energy management
        if self.energy < 10:
            reward -= 5.0  # Running out of energy
        
        return reward
