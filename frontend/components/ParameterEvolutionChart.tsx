/**
 * Live visualization of parameter evolution during optimization
 */

import { GenerationStats } from '@/lib/ml/types'

interface ParameterEvolutionChartProps {
  history: GenerationStats[]
  maxGenerations: number
}

export function ParameterEvolutionChart({ history, maxGenerations }: ParameterEvolutionChartProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-4xl mb-3">📊</div>
        <p>Evolution chart will appear here</p>
        <p className="text-sm mt-1">Start optimization to see progress</p>
      </div>
    )
  }

  const maxFitness = Math.max(...history.map(h => h.bestFitness), 1)
  const minLapTime = Math.min(...history.map(h => h.bestLapTime))
  const maxLapTime = Math.max(...history.map(h => h.bestLapTime))

  return (
    <div className="space-y-6">
      {/* Fitness Evolution */}
      <div>
        <h4 className="text-sm font-bold text-green-400 mb-3">Fitness Score Evolution</h4>
        <div className="relative h-32 bg-input/30 rounded-lg p-4">
          <svg width="100%" height="100%" className="overflow-visible">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100%"
                y1={`${y * 100}%`}
                y2={`${y * 100}%`}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="2,2"
              />
            ))}

            {/* Best fitness line */}
            <polyline
              points={history
                .map((h, i) => {
                  const x = (i / (maxGenerations - 1)) * 100
                  const y = 100 - (h.bestFitness / maxFitness) * 100
                  return `${x},${y}`
                })
                .join(' ')}
              fill="none"
              stroke="rgb(74, 222, 128)"
              strokeWidth="2"
              className="drop-shadow-lg"
            />

            {/* Average fitness line */}
            <polyline
              points={history
                .map((h, i) => {
                  const x = (i / (maxGenerations - 1)) * 100
                  const y = 100 - (h.avgFitness / maxFitness) * 100
                  return `${x},${y}`
                })
                .join(' ')}
              fill="none"
              stroke="rgb(168, 85, 247)"
              strokeWidth="1.5"
              strokeOpacity="0.6"
              strokeDasharray="4,4"
            />

            {/* Data points */}
            {history.map((h, i) => {
              const x = (i / (maxGenerations - 1)) * 100
              const y = 100 - (h.bestFitness / maxFitness) * 100
              return (
                <circle
                  key={i}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="3"
                  fill="rgb(74, 222, 128)"
                  className="drop-shadow"
                >
                  <title>Gen {h.generation}: {h.bestFitness.toFixed(0)}</title>
                </circle>
              )
            })}
          </svg>

          {/* Legend */}
          <div className="absolute top-2 right-2 flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-green-400" />
              <span className="text-green-400">Best</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-purple-400 opacity-60" style={{ borderTop: '1.5px dashed' }} />
              <span className="text-purple-400">Avg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lap Time Evolution */}
      <div>
        <h4 className="text-sm font-bold text-blue-400 mb-3">Lap Time Improvement</h4>
        <div className="relative h-32 bg-input/30 rounded-lg p-4">
          <svg width="100%" height="100%" className="overflow-visible">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100%"
                y1={`${y * 100}%`}
                y2={`${y * 100}%`}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="2,2"
              />
            ))}

            {/* Best lap time line (inverted - lower is better) */}
            <polyline
              points={history
                .map((h, i) => {
                  const x = (i / (maxGenerations - 1)) * 100
                  const normalized = (h.bestLapTime - minLapTime) / (maxLapTime - minLapTime || 1)
                  const y = 100 - (1 - normalized) * 100 // Invert so lower times are higher on graph
                  return `${x},${y}`
                })
                .join(' ')}
              fill="none"
              stroke="rgb(96, 165, 250)"
              strokeWidth="2"
              className="drop-shadow-lg"
            />

            {/* Average lap time line */}
            <polyline
              points={history
                .map((h, i) => {
                  const x = (i / (maxGenerations - 1)) * 100
                  const normalized = (h.avgLapTime - minLapTime) / (maxLapTime - minLapTime || 1)
                  const y = 100 - (1 - normalized) * 100
                  return `${x},${y}`
                })
                .join(' ')}
              fill="none"
              stroke="rgb(251, 191, 36)"
              strokeWidth="1.5"
              strokeOpacity="0.6"
              strokeDasharray="4,4"
            />

            {/* Data points */}
            {history.map((h, i) => {
              const x = (i / (maxGenerations - 1)) * 100
              const normalized = (h.bestLapTime - minLapTime) / (maxLapTime - minLapTime || 1)
              const y = 100 - (1 - normalized) * 100
              return (
                <circle
                  key={i}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="3"
                  fill="rgb(96, 165, 250)"
                  className="drop-shadow"
                >
                  <title>Gen {h.generation}: {h.bestLapTime.toFixed(2)}s</title>
                </circle>
              )
            })}
          </svg>

          {/* Legend */}
          <div className="absolute top-2 right-2 flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-400" />
              <span className="text-blue-400">Best</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-yellow-400 opacity-60" style={{ borderTop: '1.5px dashed' }} />
              <span className="text-yellow-400">Avg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-green-500/10 rounded-md">
          <div className="text-xs text-muted-foreground">Best Fitness</div>
          <div className="text-lg font-bold text-green-400">
            {history[history.length - 1]?.bestFitness.toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {history.length > 1 && (
              <span className="text-green-400">
                +{((history[history.length - 1].bestFitness - history[0].bestFitness) / history[0].bestFitness * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-md">
          <div className="text-xs text-muted-foreground">Best Lap Time</div>
          <div className="text-lg font-bold text-blue-400">
            {minLapTime.toFixed(2)}s
          </div>
          <div className="text-xs text-muted-foreground">
            {history.length > 1 && history[0].bestLapTime > minLapTime && (
              <span className="text-blue-400">
                -{((history[0].bestLapTime - minLapTime) / history[0].bestLapTime * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="p-3 bg-purple-500/10 rounded-md">
          <div className="text-xs text-muted-foreground">Generations</div>
          <div className="text-lg font-bold text-purple-400">
            {history.length}
          </div>
          <div className="text-xs text-muted-foreground">
            / {maxGenerations}
          </div>
        </div>
      </div>
    </div>
  )
}
