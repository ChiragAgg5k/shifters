"""CLI runner for the mobility simulation."""

import sys
import time
import argparse
from typing import Optional

from shifters.agents.base_agent import RacingVehicle
from shifters.environment.track import Track
from shifters.simcore.simulator import MobilitySimulation


def run_sample_race(
    num_agents: int = 5,
    track_length: float = 1000.0,
    num_laps: int = 3,
    max_steps: Optional[int] = None,
    show_leaderboard: bool = True,
):
    """
    Run a sample racing simulation.

    Args:
        num_agents: Number of racing agents
        track_length: Length of the track in meters
        num_laps: Number of laps to complete
        max_steps: Maximum simulation steps (None for unlimited)
        show_leaderboard: Whether to display live leaderboard
    """
    print("🏎️  Shifters - Competitive Mobility Systems Simulator")
    print("=" * 80)

    # Create track
    track = Track(
        length=track_length,
        num_laps=num_laps,
        track_type="circuit",
        name="Monaco Street Circuit",
    )

    # Add some checkpoints
    track.add_checkpoint("sector1", track_length * 0.33, "Sector 1")
    track.add_checkpoint("sector2", track_length * 0.66, "Sector 2")

    print(f"Track: {track.name}")
    print(
        f"Length: {track.length}m | Laps: {track.num_laps} | Total: {track.length * track.num_laps}m"
    )
    print(f"Checkpoints: {len(track.checkpoints)}")
    print("=" * 80 + "\n")

    # Create simulation
    sim = MobilitySimulation(track=track, time_step=0.1)

    # Create racing vehicles with varied performance
    vehicle_names = [
        "Lightning",
        "Thunder",
        "Phoenix",
        "Viper",
        "Falcon",
        "Dragon",
        "Eagle",
        "Cobra",
        "Raptor",
        "Titan",
    ]

    print(f"Creating {num_agents} racing vehicles...")
    for i in range(num_agents):
        # Vary performance characteristics
        max_speed = 180 + (i * 5)  # 180-220 m/s
        acceleration = 12 + (i * 0.5)  # 12-16 m/s²

        vehicle = RacingVehicle(
            model=sim,
            unique_id=f"vehicle_{i}",
            name=vehicle_names[i % len(vehicle_names)] + f" #{i+1}",
            max_speed=max_speed,
            acceleration=acceleration,
        )

        sim.add_agent(vehicle)
        print(
            f"  ✓ {vehicle.name} - Max Speed: {max_speed}m/s, Acceleration: {acceleration}m/s²"
        )

    print("\n" + "=" * 80)

    # Register event callbacks
    def on_lap_complete(agent, lap, lap_time):
        print(f"🏁 {agent.name} completed lap {lap} in {lap_time:.2f}s")

    def on_agent_finish(agent, position):
        print(
            f"🏆 {agent.name} finished in position {position}! Time: {agent.total_time:.2f}s"
        )

    sim.register_event_callback("lap_complete", on_lap_complete)
    sim.register_event_callback("agent_finish", on_agent_finish)

    # Run simulation
    print("\n🚦 Starting race...\n")
    time.sleep(1)

    if show_leaderboard:
        # Run with periodic leaderboard updates
        sim.start_race()
        step_count = 0
        last_leaderboard_update = time.time()
        leaderboard_interval = 5.0  # Show leaderboard every 5 seconds

        while sim.running:
            sim.step()
            step_count += 1

            # Show leaderboard periodically
            if (time.time() - last_leaderboard_update) >= leaderboard_interval:
                sim.leaderboard.print_leaderboard(top_n=10)
                last_leaderboard_update = time.time()

            # Check max steps
            if max_steps and step_count >= max_steps:
                sim.running = False
                print("⏱️  Maximum steps reached")
                break
    else:
        # Run without periodic updates
        sim.run(max_steps=max_steps, verbose=True)

    # Final results
    print("\n" + "=" * 80)
    print("FINAL RESULTS".center(80))
    print("=" * 80)
    sim.leaderboard.print_leaderboard()

    # Show finished agents
    finished = sim.leaderboard.get_finished_agents()
    if finished:
        print("🏆 PODIUM FINISHERS:")
        for i, agent in enumerate(finished[:3], 1):
            medal = ["🥇", "🥈", "🥉"][i - 1] if i <= 3 else f"{i}."
            print(f"  {medal} {agent['name']} - {agent['total_time']:.2f}s")

    print("\n" + "=" * 80)
    print(
        f"Simulation completed in {sim.current_step} steps ({sim.simulation_time:.2f}s simulated time)"
    )
    print("=" * 80)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Shifters - Competitive Mobility Systems Simulator"
    )

    parser.add_argument(
        "-n",
        "--num-agents",
        type=int,
        default=5,
        help="Number of racing agents (default: 5)",
    )

    parser.add_argument(
        "-l",
        "--track-length",
        type=float,
        default=1000.0,
        help="Track length in meters (default: 1000.0)",
    )

    parser.add_argument(
        "--laps", type=int, default=3, help="Number of laps (default: 3)"
    )

    parser.add_argument(
        "--max-steps",
        type=int,
        default=None,
        help="Maximum simulation steps (default: unlimited)",
    )

    parser.add_argument(
        "--no-leaderboard", action="store_true", help="Disable live leaderboard display"
    )

    args = parser.parse_args()

    try:
        run_sample_race(
            num_agents=args.num_agents,
            track_length=args.track_length,
            num_laps=args.laps,
            max_steps=args.max_steps,
            show_leaderboard=not args.no_leaderboard,
        )
    except KeyboardInterrupt:
        print("\n\n⏹️  Simulation interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
