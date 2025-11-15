# Shifters Frontend Setup

This is a modern Next.js frontend for the Shifters Racing Simulator, built with:
- **Next.js 14** - React framework
- **Tailwind CSS** - Utility-first CSS
- **Lucide Icons** - Beautiful icon library
- **TypeScript** - Type safety

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:3000`

## Building for Production

```bash
npm run build
npm start
```

## Configuration

The frontend expects the backend to be running on the same host. By default, it connects to:
- **WebSocket:** `ws://localhost:8000/ws`
- **API:** `http://localhost:8000/api`

If your backend is on a different host, you'll need to update the connection URLs in `app/page.tsx`.

## Features

- **Real-time Race Visualization** - Canvas-based track rendering with live agent positions
- **Live Leaderboard** - Ranked standings with lap counts and progress
- **Race Statistics** - Track info, distances, lap times, and speeds
- **Control Deck** - Configure race parameters and control simulation
- **Connection Status** - Real-time WebSocket connection indicator
- **Responsive Design** - Works on desktop and tablet devices

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main dashboard
│   └── globals.css       # Global styles
├── components/
│   ├── ControlDeck.tsx   # Race configuration & controls
│   ├── RaceVisualization.tsx  # Canvas visualization
│   ├── DataGrid.tsx      # Leaderboard & stats
│   └── ConnectionStatus.tsx   # Connection indicator
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Styling

The UI uses a dark red theme with:
- **Primary Color:** Red (#ef4444)
- **Background:** Very dark (#050509)
- **Cards:** Dark with subtle borders
- **Text:** Light gray on dark background

All styling is done with Tailwind CSS utility classes for consistency and maintainability.
