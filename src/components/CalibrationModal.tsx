interface CalibrationModalProps {
  progress: number
  visible: boolean
}

export function CalibrationModal({ progress, visible }: CalibrationModalProps) {
  if (!visible) return null

  const pct = Math.round(progress * 100)

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-2xl border border-emerald-500/40 bg-purple-950/95 p-6 text-center shadow-xl">
        <div className="mb-2 text-2xl">🧘</div>
        <h3 className="mb-2 text-xl font-bold text-emerald-300">Calibrate Posture</h3>
        <p className="mb-4 text-sm text-purple-200">
          Sit in your best desk posture. Hold still while we learn your baseline.
        </p>
        <div className="mb-2 h-3 overflow-hidden rounded-full bg-purple-900">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-purple-400">{pct}% — {10 - Math.floor(progress * 10)}s remaining</p>
      </div>
    </div>
  )
}
