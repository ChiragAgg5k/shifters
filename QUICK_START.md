# Quick Start - F1 Simulator

## 🚀 Start the Simulator

```bash
cd frontend
npm run dev
```

Then open: **http://localhost:3000**

## 🎮 How to Use

1. **Configure Race**
   - Number of Agents: 2-20 (default: 5)
   - Number of Laps: 1-100 (default: 3)
   - Circuit: Select from Monaco, Silverstone, Spa, Melbourne, Monza
   - Track Temperature: 10-60°C (default: 35°C)
   - Rain Probability: 0-100% (default: 0%)

2. **Start Race**
   - Click "Start Race" button
   - Watch the simulation run in real-time

3. **Monitor Progress**
   - **Track Visualization**: See vehicles moving around the circuit
   - **Live Leaderboard**: Real-time position updates
   - **Telemetry**: Energy, tire wear, temperature, damage

4. **Stop Race**
   - Click "Stop Race" button to end simulation
   - Click "Reset" to clear and start fresh

## 📊 What You'll See

### Track Visualization
- Circuit rendered with vehicle positions
- Real-time position updates
- Vehicle colors for identification

### Leaderboard
- Current position and lap count
- Progress percentage
- Weather and track temperature display

### Telemetry
- Vehicle speed
- Tire wear and temperature
- Energy levels
- Damage accumulation
- Pit stop count

## 🏎️ Physics Features

- **Realistic F1 Physics**: Aerodynamics, tire wear, energy management
- **DRS System**: Automatic drag reduction on straights
- **Slipstreaming**: Drafting benefits when following
- **Weather Effects**: Rain reduces grip
- **Safety Car**: Deployed on incidents
- **DNF System**: Random retirements with safety car deployment

## 🎯 Example Scenarios

### Quick Race
- 5 agents, 3 laps, Monaco, clear weather
- ~2-3 minutes simulation time

### Wet Weather Challenge
- 10 agents, 5 laps, Spa, 80% rain probability
- ~4-5 minutes simulation time

### Long Distance
- 20 agents, 10 laps, Silverstone, clear weather
- ~8-10 minutes simulation time

## 🐛 Troubleshooting

**Race won't start?**
- Check browser console for errors
- Ensure all fields are filled
- Try refreshing the page

**Vehicles not moving?**
- Wait a few seconds for simulation to initialize
- Check if "RACING" indicator is lit
- Verify track is rendering

**UI not updating?**
- Check browser DevTools Network tab
- Ensure no console errors
- Try stopping and starting again

## 📁 Project Structure

```
frontend/
├── app/page.tsx                    # Main page
├── components/
│   ├── ControlDeck.tsx            # Race controls
│   ├── RaceVisualization.tsx       # Track visualization
│   └── DataGrid.tsx               # Telemetry display
└── lib/
    ├── hooks/useRaceSimulation.ts # Simulation hook
    ├── physics/RacingVehicle.ts   # Physics engine
    ├── track/Track.ts             # Track system
    ├── simulation/RaceSimulation.ts # Race coordinator
    └── data/circuits.ts           # Circuit data
```

## 🔧 Development

### Build for Production
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
```

### Deploy
```bash
# Vercel
vercel deploy

# GitHub Pages
npm run build
# Push to gh-pages branch
```

## 📝 Notes

- All simulation runs **100% in the browser** - no backend needed
- Simulation runs at **10 FPS** for smooth performance
- Each race is **deterministic** with same configuration
- Can handle up to **20 vehicles** simultaneously
- **No internet required** after initial load

## 🎓 Learning Resources

- See `FRONTEND_SIMULATOR.md` for technical details
- See `INTEGRATION_COMPLETE.md` for implementation notes
- Check console logs for simulation events

## 🚀 Ready to Race?

Just run `npm run dev` and start racing! 🏁
