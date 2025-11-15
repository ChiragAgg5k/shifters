"""Simplified Solara-based visualization for Shifters."""

import solara
from typing import Callable

from shifters import MobilitySimulation, Track, RacingVehicle


# Global model instance for the Solara app
current_model = solara.reactive(None)
is_running = solara.reactive(False)
step_counter = solara.reactive(0)  # Used to trigger re-renders


def create_model(num_agents: int = 5, track_length: float = 1000, num_laps: int = 3):
    """Create a new simulation model."""
    track = Track(
        length=track_length,
        num_laps=num_laps,
        track_type="circuit",
        name="Solara Track",
    )

    track.add_checkpoint("sector1", track_length * 0.33, "Sector 1")
    track.add_checkpoint("sector2", track_length * 0.66, "Sector 2")

    sim = MobilitySimulation(track=track, time_step=0.1)

    for i in range(num_agents):
        max_speed = 180 + (i * 5)
        acceleration = 12 + (i * 0.5)

        vehicle = RacingVehicle(
            model=sim,
            unique_id=f"vehicle_{i}",
            name=f"Racer #{i+1}",
            max_speed=max_speed,
            acceleration=acceleration,
        )
        sim.add_agent(vehicle)

    return sim


@solara.component
def RaceControls():
    """Control panel for the race."""
    num_agents = solara.use_reactive(5)
    track_length = solara.use_reactive(1000)
    num_laps = solara.use_reactive(3)

    def start_race():
        model = create_model(num_agents.value, track_length.value, num_laps.value)
        model.start_race()
        current_model.value = model
        step_counter.value = 0  # Reset counter
        is_running.value = True

    def stop_race():
        if current_model.value:
            current_model.value.running = False
        is_running.value = False

    def step_race():
        if current_model.value and current_model.value.running:
            current_model.value.step()

    with solara.Card("Race Controls"):
        with solara.Row():
            solara.SliderInt("Agents", value=num_agents, min=2, max=20)
            solara.SliderInt(
                "Track Length (m)", value=track_length, min=500, max=5000, step=100
            )
            solara.SliderInt("Laps", value=num_laps, min=1, max=10)

        with solara.Row():
            solara.Button("Start Race", on_click=start_race, disabled=is_running.value)
            solara.Button(
                "Stop Race", on_click=stop_race, disabled=not is_running.value
            )
            solara.Button("Step", on_click=step_race, disabled=not is_running.value)


@solara.component
def RaceStats():
    """Display race statistics."""
    model = current_model.value
    _ = step_counter.value  # Force re-render when step_counter changes

    if model is None:
        with solara.Card("Race Statistics"):
            solara.Markdown("No active race. Click 'Start Race' to begin.")
        return

    active_agents = len([a for a in model.agents_list if not a.finished])
    finished_agents = len(model.finished_agents)

    with solara.Card("Race Statistics"):
        solara.Markdown(f"**Simulation Time:** {model.simulation_time:.1f}s")
        solara.Markdown(f"**Current Step:** {model.current_step}")
        solara.Markdown(f"**Active Agents:** {active_agents}")
        solara.Markdown(f"**Finished:** {finished_agents}")
        solara.Markdown(f"**Track:** {model.environment.track.name}")
        solara.Markdown(f"**Track Length:** {model.environment.track.length}m")


@solara.component
def Leaderboard():
    """Display live leaderboard."""
    model = current_model.value
    _ = step_counter.value  # Force re-render when step_counter changes

    if model is None:
        with solara.Card("🏁 Live Leaderboard"):
            solara.Markdown("No race data available")
        return

    standings = model.get_current_standings()

    with solara.Card("🏁 Live Leaderboard"):
        for i, agent in enumerate(standings[:10]):
            status = "✓" if agent["finished"] else "🏃"
            medal = ""
            if i == 0:
                medal = "🥇"
            elif i == 1:
                medal = "🥈"
            elif i == 2:
                medal = "🥉"

            solara.Markdown(
                f"{medal} **{agent['rank']}. {agent['name']}** - "
                f"Lap {agent['lap']} - {agent['progress']:.1f}% {status}"
            )


@solara.component
def Page():
    """Main Solara page component."""
    import asyncio
    import threading

    def run_simulation_loop():
        """Run the simulation in a loop."""
        while is_running.value:
            if current_model.value and current_model.value.running:
                current_model.value.step()
                # Increment counter to trigger Solara re-renders
                step_counter.value += 1

                # Check if race is finished
                if not current_model.value.running:
                    is_running.value = False
                    break

            # Sleep to control update rate
            import time

            time.sleep(0.1)  # 10 steps per second

    # Start simulation loop when running changes
    def start_loop():
        if is_running.value and current_model.value:
            thread = threading.Thread(target=run_simulation_loop, daemon=True)
            thread.start()

    solara.use_effect(start_loop, dependencies=[is_running.value])

    with solara.Column():
        solara.Title("🏎️ Shifters - Racing Simulator")

        RaceControls()

        with solara.Row():
            with solara.Column():
                RaceStats()
            with solara.Column():
                Leaderboard()


if __name__ == "__main__":
    print("🚀 Starting Solara visualization")
    print("📊 Run with: solara run shifters/ui/mesa_visualization.py")
    print("🔗 Opens at: http://localhost:8765")
