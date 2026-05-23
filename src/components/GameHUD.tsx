import {
  MAX_HP,
  MAX_MANA,
  POSTURE_GOOD,
  POSTURE_WARNING,
  SPELL_LABELS,
  type SpellType,
} from '../game/constants'
import { formatTime, type GameState } from '../game/engine'
import { postureLabel } from '../vision/posture'

interface GameHUDProps {
  state: GameState
  bossTimeUntil: number
  onSkipToBoss?: () => void
}

function Bar({
  label,
  value,
  max,
  colorClass,
}: {
  label: string
  value: number
  max: number
  colorClass: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wider text-purple-200">
        <span>{label}</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-purple-950/80 ring-1 ring-purple-500/30">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function GameHUD({ state, bossTimeUntil, onSkipToBoss }: GameHUDProps) {
  const posturePct = state.postureScore
  const postureBarColor =
    posturePct >= POSTURE_GOOD
      ? 'bg-emerald-400'
      : posturePct >= POSTURE_WARNING
        ? 'bg-yellow-400'
        : 'bg-red-400'

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-purple-500/30 bg-purple-950/70 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-purple-100">Adventure HUD</h2>
        <span className="rounded-full bg-purple-800/80 px-3 py-1 text-xs font-semibold text-purple-200">
          Boss in {formatTime(bossTimeUntil)}
        </span>
      </div>

      <Bar label="HP" value={state.hp} max={MAX_HP} colorClass="bg-red-500" />
      <Bar label="Mana" value={state.mana} max={MAX_MANA} colorClass="bg-blue-500" />

      <div>
        <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wider text-purple-200">
          <span>Posture</span>
          <span>{postureLabel(state.postureScore)} ({Math.round(state.postureScore)})</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-purple-950/80 ring-1 ring-purple-500/30">
          <div
            className={`h-full rounded-full transition-all duration-300 ${postureBarColor}`}
            style={{ width: `${posturePct}%` }}
          />
        </div>
      </div>

      {state.lastSpell && (
        <div className="rounded-lg bg-purple-900/60 px-3 py-2 text-center text-sm font-semibold text-amber-200">
          Cast {SPELL_LABELS[state.lastSpell]}!
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-purple-300">
        <div className="rounded-lg bg-purple-900/40 p-2">
          <span className="font-bold text-purple-100">Open palm</span> — Shield
        </div>
        <div className="rounded-lg bg-purple-900/40 p-2">
          <span className="font-bold text-purple-100">Fist</span> — Smash
        </div>
        <div className="rounded-lg bg-purple-900/40 p-2">
          <span className="font-bold text-purple-100">Point</span> — Fireball
        </div>
        <div className="rounded-lg bg-purple-900/40 p-2">
          <span className="font-bold text-purple-100">Peace</span> — Heal
        </div>
      </div>

      {onSkipToBoss && (
        <button
          type="button"
          onClick={onSkipToBoss}
          className="mt-1 rounded-lg border border-purple-500/40 px-3 py-1.5 text-xs text-purple-300 transition hover:bg-purple-800/50"
        >
          Demo: Skip to Boss
        </button>
      )}
    </div>
  )
}

export function spellSummary(counts: Record<SpellType, number>): string {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${SPELL_LABELS[k as SpellType]} x${n}`)
    .join(', ') || 'None'
}
