"""Generate architecture flowchart for Shifters system."""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.lines as mlines

# Create figure
fig, ax = plt.subplots(1, 1, figsize=(16, 12))
ax.set_xlim(0, 10)
ax.set_ylim(0, 12)
ax.axis("off")

# Define colors
color_agent = "#FF6B6B"
color_env = "#4ECDC4"
color_sim = "#45B7D1"
color_leaderboard = "#FFA07A"
color_data = "#98D8C8"
color_ui = "#C7CEEA"


def create_box(ax, x, y, width, height, text, color, fontsize=10, bold=False):
    """Create a colored box with text."""
    box = FancyBboxPatch(
        (x, y),
        width,
        height,
        boxstyle="round,pad=0.1",
        edgecolor="black",
        facecolor=color,
        linewidth=2,
        alpha=0.8,
    )
    ax.add_patch(box)

    weight = "bold" if bold else "normal"
    ax.text(
        x + width / 2,
        y + height / 2,
        text,
        ha="center",
        va="center",
        fontsize=fontsize,
        weight=weight,
        wrap=True,
    )
    return (x + width / 2, y)


def create_arrow(ax, x1, y1, x2, y2, label="", style="->"):
    """Create an arrow between two points."""
    arrow = FancyArrowPatch(
        (x1, y1),
        (x2, y2),
        arrowstyle=style,
        color="black",
        linewidth=2,
        mutation_scale=20,
    )
    ax.add_patch(arrow)

    if label:
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(
            mid_x,
            mid_y,
            label,
            fontsize=8,
            bbox=dict(boxstyle="round", facecolor="white", alpha=0.8),
        )


# Title
ax.text(
    5,
    11.5,
    "Shifters - Competitive Mobility Systems Simulator",
    ha="center",
    fontsize=18,
    weight="bold",
)
ax.text(
    5, 11, "System Architecture & Data Flow", ha="center", fontsize=14, style="italic"
)

# Layer 1: Input/Configuration (Top)
create_box(
    ax,
    0.5,
    9.5,
    2,
    0.8,
    "Scenario Config\n(Formula E, MotoGP,\nDrones, etc.)",
    color_data,
    9,
)
create_box(
    ax, 3, 9.5, 2, 0.8, "Track Definition\n(Length, Laps,\nCheckpoints)", color_env, 9
)
create_box(
    ax,
    5.5,
    9.5,
    2,
    0.8,
    "Agent Parameters\n(Speed, Acceleration,\nEnergy)",
    color_agent,
    9,
)
create_box(ax, 8, 9.5, 1.5, 0.8, "User Input\n(CLI/API)", color_ui, 9)

# Layer 2: Core Components
# Simulation Engine (Center)
sim_x, sim_y = create_box(
    ax,
    3.5,
    7,
    3,
    1.2,
    "Simulation Engine\n(MobilitySimulation)\n• Time stepping\n• Event management\n• Coordination",
    color_sim,
    10,
    bold=True,
)

# Environment (Left)
env_x, env_y = create_box(
    ax,
    0.3,
    7,
    2.5,
    1.2,
    "Environment\n• Track\n• Checkpoints\n• Conditions",
    color_env,
    9,
    bold=True,
)

# Agent Set (Right)
agent_x, agent_y = create_box(
    ax,
    7.2,
    7,
    2.5,
    1.2,
    "Agent Set\n(Mesa AgentSet)\n• All agents\n• Batch operations",
    color_agent,
    9,
    bold=True,
)

# Layer 3: Agent Types & Leaderboard
create_box(ax, 6.8, 5, 1.5, 0.9, "MobilityAgent\n(Base)", color_agent, 9)
create_box(ax, 8.5, 5, 1.4, 0.9, "RacingVehicle\n(Specialized)", color_agent, 9)

create_box(
    ax,
    0.3,
    5,
    2.8,
    0.9,
    "Leaderboard System\n• Real-time ranking\n• AgentRanking",
    color_leaderboard,
    9,
    bold=True,
)

# Layer 4: Events & State
create_box(
    ax,
    3.5,
    3.5,
    1.5,
    0.8,
    "Events\n• Lap complete\n• Checkpoint\n• Finish",
    color_data,
    8,
)
create_box(
    ax,
    5.2,
    3.5,
    1.5,
    0.8,
    "State Updates\n• Position\n• Speed\n• Progress",
    color_data,
    8,
)

# Layer 5: Data Collection & Output
create_box(
    ax,
    0.5,
    1.5,
    2.5,
    0.9,
    "Data Collector\n(Mesa)\n• Time series\n• Agent metrics",
    color_data,
    9,
)
create_box(
    ax,
    3.5,
    1.5,
    2,
    0.9,
    "Live Leaderboard\n• Rankings\n• Progress %",
    color_leaderboard,
    9,
)
create_box(
    ax,
    6,
    1.5,
    1.8,
    0.9,
    "Simulation State\n• Current time\n• Agent states",
    color_sim,
    9,
)
create_box(ax, 8.2, 1.5, 1.5, 0.9, "Callbacks\n• Custom\n  handlers", color_data, 8)

# Layer 6: Output/UI
create_box(ax, 1.5, 0.1, 1.8, 0.7, "CLI Output\n(Terminal)", color_ui, 9)
create_box(ax, 3.8, 0.1, 1.8, 0.7, "API/WebSocket\n(Future)", color_ui, 9)
create_box(ax, 6.1, 0.1, 1.8, 0.7, "Visualization\n(Future)", color_ui, 9)
create_box(ax, 8.3, 0.1, 1.3, 0.7, "Export Data", color_ui, 9)

# Arrows - Configuration to Core
create_arrow(ax, 1.5, 9.5, 2, 8.2, "Load")
create_arrow(ax, 4, 9.5, 5, 8.2, "Configure")
create_arrow(ax, 6.5, 9.5, 7, 8.2, "Initialize")

# Arrows - Core Components interaction
create_arrow(ax, 2.8, 7.6, 3.5, 7.6, "Track\ndata", "<->")
create_arrow(ax, 6.5, 7.6, 7.2, 7.6, "Agent\nsteps", "<->")

# Arrows - Simulation to Agents
create_arrow(ax, 7.5, 7, 7.5, 5.9, "Execute")

# Arrows - Simulation to Leaderboard
create_arrow(ax, 3.5, 7, 2.5, 5.9, "Update\nrankings")

# Arrows - To Events/State
create_arrow(ax, 5, 7, 4.2, 4.3, "Trigger")
create_arrow(ax, 5, 7, 6, 4.3, "Collect")

# Arrows - To Output Layer
create_arrow(ax, 4.2, 3.5, 1.7, 2.4, "")
create_arrow(ax, 2, 5, 4.5, 2.4, "")
create_arrow(ax, 5.8, 3.5, 6.9, 2.4, "")
create_arrow(ax, 6, 3.5, 8.9, 2.4, "")

# Arrows - To UI
create_arrow(ax, 1.8, 1.5, 2.3, 0.8, "")
create_arrow(ax, 4.5, 1.5, 4.7, 0.8, "")
create_arrow(ax, 6.9, 1.5, 6.9, 0.8, "")
create_arrow(ax, 8.9, 1.5, 9, 0.8, "")

# Add Legend
legend_y = 10.2
ax.text(0.3, legend_y, "Component Types:", fontsize=10, weight="bold")

legend_items = [
    (0.5, legend_y - 0.5, "Agents", color_agent),
    (2, legend_y - 0.5, "Environment", color_env),
    (3.8, legend_y - 0.5, "Simulation", color_sim),
    (5.5, legend_y - 0.5, "Leaderboard", color_leaderboard),
    (7.2, legend_y - 0.5, "Data/Events", color_data),
    (8.7, legend_y - 0.5, "UI/Output", color_ui),
]

for x, y, label, color in legend_items:
    small_box = FancyBboxPatch(
        (x, y),
        0.3,
        0.25,
        boxstyle="round,pad=0.02",
        facecolor=color,
        edgecolor="black",
        alpha=0.8,
    )
    ax.add_patch(small_box)
    ax.text(x + 0.4, y + 0.125, label, fontsize=8, va="center")

# Add execution flow indicator
ax.text(0.2, 6, "Execution Flow", fontsize=11, weight="bold", rotation=90, va="center")
create_arrow(ax, 0.15, 9, 0.15, 1.5, "", style="->")

plt.tight_layout()
plt.savefig(
    "shifters_architecture.png", dpi=300, bbox_inches="tight", facecolor="white"
)
print("✅ Architecture diagram saved as 'shifters_architecture.png'")
plt.close()

print("\n📊 Diagram includes:")
print("  • System components and their relationships")
print("  • Data flow between modules")
print("  • Layer-based architecture (Input → Core → Processing → Output)")
print("  • Color-coded component types")
