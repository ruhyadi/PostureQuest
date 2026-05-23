import { BOSS_GESTURE_REQUIRED, BOSS_POSTURE_THRESHOLD } from '../game/constants'

interface BossOverlayProps {
  visible: boolean
  timeLeft: number
  gesturesCast: number
  postureScore: number
}

export function BossOverlay({
  visible,
  timeLeft,
  gesturesCast,
  postureScore,
}: BossOverlayProps) {
  if (!visible) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4">
      <div className="mx-auto max-w-md rounded-2xl border-2 border-red-500/60 bg-red-950/80 p-4 text-center shadow-lg backdrop-blur-sm">
        <h3 className="text-xl font-black uppercase tracking-wide text-red-300">
          Desk Dragon Appears!
        </h3>
        <p className="mt-1 text-sm text-red-100">
          Hold posture above {BOSS_POSTURE_THRESHOLD} and cast {BOSS_GESTURE_REQUIRED} spells
        </p>
        <div className="mt-3 flex justify-center gap-6 text-sm font-bold">
          <span className="text-amber-300">⏱ {Math.ceil(timeLeft)}s</span>
          <span className="text-blue-300">✨ {gesturesCast}/{BOSS_GESTURE_REQUIRED}</span>
          <span className={postureScore >= BOSS_POSTURE_THRESHOLD ? 'text-emerald-300' : 'text-red-300'}>
            Posture {Math.round(postureScore)}
          </span>
        </div>
      </div>
    </div>
  )
}
