"""
Launcher script for Shifters visualization servers.

Provides multiple visualization options:
1. Custom WebSocket-based UI (FastAPI + WebSocket)
2. Mesa-native Solara UI (integrated with Mesa ecosystem)
"""

import sys
import argparse


def run_custom_ui(host: str = "0.0.0.0", port: int = 8000):
    """Run the custom WebSocket-based visualization server."""
    from shifters.ui.server import run_server

    run_server(host=host, port=port)


def run_mesa_ui():
    """Run the Mesa-native Solara visualization."""
    print("🚀 Starting Mesa Solara Visualization")
    print("📊 The visualization will open in your browser")
    print("🔗 Default URL: http://localhost:8765")
    print(
        "\nTo run manually: PYTHONPATH=. solara run shifters/ui/mesa_visualization.py\n"
    )

    import subprocess
    import os

    env = os.environ.copy()
    env["PYTHONPATH"] = "."

    subprocess.run(
        ["solara", "run", "shifters/ui/mesa_visualization.py", "--host", "0.0.0.0"],
        env=env,
    )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Shifters Visualization Launcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run custom WebSocket UI (default)
  python run_visualization.py

  # Run custom UI on specific port
  python run_visualization.py --port 3000

  # Run Mesa-native Solara UI
  python run_visualization.py --mesa

  # Run custom UI on all interfaces
  python run_visualization.py --host 0.0.0.0 --port 8000
        """,
    )

    parser.add_argument(
        "--mesa",
        action="store_true",
        help="Use Mesa-native Solara visualization instead of custom UI",
    )

    parser.add_argument(
        "--host", type=str, default="0.0.0.0", help="Host to bind to (default: 0.0.0.0)"
    )

    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to run on (default: 8000, Mesa uses 8765)",
    )

    args = parser.parse_args()

    print("=" * 60)
    print("🏎️  SHIFTERS - Competitive Mobility Systems Simulator")
    print("=" * 60)
    print()

    if args.mesa:
        run_mesa_ui()
    else:
        print("Starting Custom WebSocket Visualization Server...")
        print()
        run_custom_ui(host=args.host, port=args.port)


if __name__ == "__main__":
    main()
