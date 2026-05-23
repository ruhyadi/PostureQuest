import { spellSummary } from './GameHUD'
import {
  formatTime,
  getAveragePosture,
  getSessionDurationSec,
  type GameState,
} from '../game/engine'

interface RunSummaryProps {
  state: GameState
  onRestart: () => void
}

export function RunSummary({ state, onRestart }: RunSummaryProps) {
  const avgPosture = getAveragePosture(state)
  const duration = getSessionDurationSec(state)

  const title = state.bossVictory
    ? 'Boss Defeated!'
    : state.gameOver
      ? 'Quest Failed'
      : 'Run Complete'

  const subtitle = state.bossVictory
    ? 'You survived the Desk Dragon with heroic posture.'
    : state.gameOver
      ? 'Your HP reached zero. The slouch goblins win this round.'
      : 'Nice work keeping your skeleton aligned.'

  return (
    <div className="flex min-h-[480px] w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-purple-500/40 bg-purple-950/80 p-8 text-center shadow-2xl">
      <div className="mb-2 text-4xl">
        {state.bossVictory ? '🏆' : state.gameOver ? '💀' : '✨'}
      </div>
      <h2 className="mb-2 text-3xl font-black text-purple-100">{title}</h2>
      <p className="mb-6 text-purple-300">{subtitle}</p>

      <div className="mb-6 grid w-full grid-cols-2 gap-3 text-left text-sm">
        <Stat label="Session time" value={formatTime(duration)} />
        <Stat label="Avg posture" value={`${avgPosture}%`} />
        <Stat label="Good posture" value={`${Math.round(state.goodPostureSeconds)}s`} />
        <Stat label="Spells cast" value={String(state.spellsCast)} />
        <Stat label="Final HP" value={String(Math.round(state.hp))} className="col-span-2" />
        <Stat label="Spell breakdown" value={spellSummary(state.spellCounts)} className="col-span-2" />
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 px-8 py-3 font-bold text-white shadow-lg transition hover:from-purple-500 hover:to-violet-400"
      >
        Start New Quest
      </button>
    </div>
  )
}

function Stat({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`rounded-lg bg-purple-900/50 p-3 ${className}`}>
      <div className="text-xs uppercase tracking-wide text-purple-400">{label}</div>
      <div className="font-semibold text-purple-100">{value}</div>
    </div>
  )
}
