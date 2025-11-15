'use client'

import { Wifi, WifiOff } from 'lucide-react'

interface ConnectionStatusProps {
  connected: boolean
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div
      className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
        connected
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      }`}
    >
      {connected ? (
        <>
          <Wifi size={16} className="animate-pulse" />
          CONNECTED
        </>
      ) : (
        <>
          <WifiOff size={16} />
          DISCONNECTED
        </>
      )}
    </div>
  )
}
