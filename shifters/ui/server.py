"""Visualization server with both custom WebSocket UI and Mesa native support."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import asyncio
import json
from pathlib import Path

from shifters import MobilitySimulation, Track, RacingVehicle, GeoJSONTrackParser


app = FastAPI(title="Shifters Visualization Server")

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active simulations
websocket_clients: List[WebSocket] = []

# F1 Circuits data
F1_CIRCUITS_FILE = (
    Path(__file__).parent.parent.parent / "data" / "circuits" / "f1-circuits.geojson"
)


def load_f1_circuits_list():
    """Load list of available F1 circuits."""
    if not F1_CIRCUITS_FILE.exists():
        return []

    try:
        with open(F1_CIRCUITS_FILE, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)
        circuits = GeoJSONTrackParser.list_circuits_in_collection(geojson_data)
        return circuits
    except Exception as e:
        print(f"Error loading F1 circuits: {e}")
        return []


class SimulationManager:
    """Manages running simulations and broadcasts updates."""

    def __init__(self):
        self.simulation: MobilitySimulation = None
        self.running = False

    async def broadcast_state(self, state: Dict[str, Any]):
        """Broadcast simulation state to all connected clients."""
        disconnected = []
        for client in websocket_clients:
            try:
                await client.send_json(state)
            except:
                disconnected.append(client)

        # Remove disconnected clients
        for client in disconnected:
            if client in websocket_clients:
                websocket_clients.remove(client)

    async def run_simulation(self, config: Dict[str, Any]):
        """Run a simulation with the given configuration."""
        # Create track - either from F1 circuit or custom
        circuit_id = config.get("circuit_id")

        if circuit_id and circuit_id != "custom" and F1_CIRCUITS_FILE.exists():
            # Load F1 circuit
            try:
                track = GeoJSONTrackParser.from_feature_collection_file(
                    str(F1_CIRCUITS_FILE),
                    circuit_id=circuit_id,
                    num_laps=config.get("num_laps", 3),
                )
                print(f"Loaded F1 circuit: {track.name}")
                print(f"Track has geometry: {track.get_info().get('has_geometry')}")
                print(f"Number of segments: {len(track.segments)}")
            except Exception as e:
                print(f"Error loading F1 circuit {circuit_id}: {e}")
                import traceback
                traceback.print_exc()
                # Fallback to custom track
                track = Track(
                    length=config.get("track_length", 1000.0),
                    num_laps=config.get("num_laps", 3),
                    track_type="circuit",
                    name=config.get("track_name", "Visualization Track"),
                )
        else:
            # Create custom track
            track = Track(
                length=config.get("track_length", 1000.0),
                num_laps=config.get("num_laps", 3),
                track_type="circuit",
                name=config.get("track_name", "Visualization Track"),
            )

        # Add checkpoints
        num_checkpoints = 4
        for i in range(1, num_checkpoints):
            track.add_checkpoint(
                f"checkpoint_{i}", track.length * (i / num_checkpoints), f"Sector {i}"
            )

        # Create simulation
        self.simulation = MobilitySimulation(
            track=track, time_step=config.get("time_step", 0.1)
        )

        # Add agents
        num_agents = config.get("num_agents", 5)
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
            "Storm",
            "Blaze",
            "Shadow",
            "Titan",
            "Fury",
        ]

        for i in range(num_agents):
            # F1-style performance characteristics
            max_speed = 85 + ((num_agents - 1 - i) * 2)  # 85-95 m/s (306-342 km/h)
            acceleration = 12 + ((num_agents - 1 - i) * 0.5)

            vehicle = RacingVehicle(
                model=self.simulation,
                unique_id=f"vehicle_{i}",
                name=vehicle_names[i % len(vehicle_names)] + f" #{i+1}",
                max_speed=max_speed,
                acceleration=acceleration,
            )
            self.simulation.add_agent(vehicle)

        # Start simulation
        self.simulation.start_race()
        self.running = True

        # Run simulation loop with broadcasts
        # Sync rendering with physics: time_step = 0.1s = 100ms
        time_step = self.simulation.time_step
        
        while self.running and self.simulation.running:
            # Step physics
            self.simulation.step()

            # Get current state
            state = self.simulation.get_simulation_state()

            # Broadcast to clients immediately
            await self.broadcast_state(state)

            # Sleep for exactly the physics time step (perfect sync)
            await asyncio.sleep(time_step)

        # Send final state
        if self.simulation:
            final_state = self.simulation.get_simulation_state()
            final_state["race_complete"] = True
            await self.broadcast_state(final_state)

        self.running = False

    def stop_simulation(self):
        """Stop the current simulation."""
        self.running = False
        if self.simulation:
            self.simulation.running = False


sim_manager = SimulationManager()


@app.get("/", response_class=HTMLResponse)
async def get_ui():
    """Serve the custom visualization UI."""
    html_path = Path(__file__).parent / "visualization.html"
    if html_path.exists():
        return FileResponse(html_path)
    return HTMLResponse(
        content="<h1>Visualization UI not found. Run from shifters/ui/ directory.</h1>"
    )


@app.post("/api/simulation/start")
async def start_simulation(config: Dict[str, Any] = None):
    """Start a new simulation."""
    if sim_manager.running:
        return {"status": "error", "message": "Simulation already running"}

    if config is None:
        config = {}

    # Start simulation in background
    asyncio.create_task(sim_manager.run_simulation(config))

    return {"status": "started", "config": config}


@app.post("/api/simulation/stop")
async def stop_simulation():
    """Stop the current simulation."""
    sim_manager.stop_simulation()
    return {"status": "stopped"}


@app.get("/api/simulation/state")
async def get_simulation_state():
    """Get current simulation state."""
    if sim_manager.simulation:
        return sim_manager.simulation.get_simulation_state()
    return {"error": "No active simulation"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    websocket_clients.append(websocket)

    try:
        # Send initial state if simulation exists
        if sim_manager.simulation:
            state = sim_manager.simulation.get_simulation_state()
            await websocket.send_json(state)

        # Keep connection alive and listen for messages
        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed

    except WebSocketDisconnect:
        if websocket in websocket_clients:
            websocket_clients.remove(websocket)


@app.get("/api/circuits")
async def get_circuits():
    """Get list of available F1 circuits."""
    circuits = load_f1_circuits_list()
    return {"circuits": circuits}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "simulation_running": sim_manager.running,
        "connected_clients": len(websocket_clients),
    }


def run_server(host: str = "0.0.0.0", port: int = 8000):
    """Run the visualization server."""
    import uvicorn

    print("🚀 Starting Shifters Visualization Server")
    print(f"📊 Open http://localhost:{port} in your browser")
    print(f"🔌 WebSocket endpoint: ws://localhost:{port}/ws")
    print(f"❤️  Health check: http://localhost:{port}/health")
    print("\nPress Ctrl+C to stop the server\n")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
