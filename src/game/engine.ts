import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import {
  BOSS_DURATION_MS,
  BOSS_GESTURE_REQUIRED,
  BOSS_INTERVAL_MS,
  BOSS_POSTURE_THRESHOLD,
  GESTURE_DEBOUNCE_MS,
  GESTURE_TO_SPELL,
  HP_DRAIN_PER_SEC,
  HP_REGEN_PER_SEC,
  MANA_REGEN_PER_SEC,
  MAX_HP,
  MAX_MANA,
  POSTURE_GOOD,
  POSTURE_WARNING,
  SLOUCH_GRACE_SEC,
  SPELL_MANA_COST,
  type GamePhase,
  type GestureType,
  type SpellType,
} from './constants'

export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

export interface GameState {
  phase: GamePhase
  hp: number
  mana: number
  postureScore: number
  slouchTimer: number
  goodPostureTimer: number
  sessionStart: number
  bossTimer: number
  bossActive: boolean
  bossTimeLeft: number
  bossGesturesCast: number
  bossPostureFailTime: number
  spellsCast: number
  spellCounts: Record<SpellType, number>
  totalPostureSum: number
  postureSampleCount: number
  goodPostureSeconds: number
  lastGesture: GestureType
  lastGestureTime: number
  lastSpell: SpellType | null
  particles: Particle[]
  poseLandmarks: NormalizedLandmark[] | null
  handLandmarks: NormalizedLandmark[][]
  gameOver: boolean
  bossVictory: boolean
}

let particleId = 0

export function createInitialState(): GameState {
  return {
    phase: 'landing',
    hp: MAX_HP,
    mana: MAX_MANA,
    postureScore: 0,
    slouchTimer: 0,
    goodPostureTimer: 0,
    sessionStart: 0,
    bossTimer: 0,
    bossActive: false,
    bossTimeLeft: BOSS_DURATION_MS / 1000,
    bossGesturesCast: 0,
    bossPostureFailTime: 0,
    spellsCast: 0,
    spellCounts: { shield: 0, smash: 0, fireball: 0, heal: 0 },
    totalPostureSum: 0,
    postureSampleCount: 0,
    goodPostureSeconds: 0,
    lastGesture: null,
    lastGestureTime: 0,
    lastSpell: null,
    particles: [],
    poseLandmarks: null,
    handLandmarks: [],
    gameOver: false,
    bossVictory: false,
  }
}

function spawnSpellParticles(
  spell: SpellType,
  width: number,
  height: number,
): Particle[] {
  const cx = width * 0.5
  const cy = height * 0.4
  const colors: Record<SpellType, string[]> = {
    shield: ['#60a5fa', '#93c5fd', '#bfdbfe'],
    smash: ['#f97316', '#fb923c', '#fdba74'],
    fireball: ['#ef4444', '#f87171', '#fbbf24'],
    heal: ['#4ade80', '#86efac', '#bbf7d0'],
  }

  const count = spell === 'smash' ? 24 : 16
  return Array.from({ length: count }, () => ({
    id: particleId++,
    x: cx + (Math.random() - 0.5) * 80,
    y: cy + (Math.random() - 0.5) * 80,
    vx: (Math.random() - 0.5) * (spell === 'fireball' ? 12 : 6),
    vy: (Math.random() - 0.5) * (spell === 'fireball' ? 12 : 6) - 2,
    life: 1,
    color: colors[spell][Math.floor(Math.random() * 3)],
    size: 3 + Math.random() * 5,
  }))
}

function castSpell(state: GameState, gesture: GestureType, width: number, height: number): GameState {
  if (!gesture || state.mana < SPELL_MANA_COST) return state

  const spell = GESTURE_TO_SPELL[gesture]
  const particles = spawnSpellParticles(spell, width, height)

  let hp = state.hp
  if (spell === 'heal') {
    hp = Math.min(MAX_HP, hp + 15)
  }

  const next: GameState = {
    ...state,
    mana: state.mana - SPELL_MANA_COST,
    spellsCast: state.spellsCast + 1,
    spellCounts: { ...state.spellCounts, [spell]: state.spellCounts[spell] + 1 },
    lastSpell: spell,
    lastGesture: gesture,
    lastGestureTime: performance.now(),
    particles: [...state.particles, ...particles],
    bossGesturesCast: state.bossActive ? state.bossGesturesCast + 1 : state.bossGesturesCast,
  }

  return next
}

function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt * 60,
      y: p.y + p.vy * dt * 60,
      vy: p.vy + 0.15 * dt * 60,
      life: p.life - dt * 1.5,
    }))
    .filter((p) => p.life > 0)
}

export interface TickInput {
  postureScore: number
  gesture: GestureType
  poseLandmarks: NormalizedLandmark[] | null
  handLandmarks: NormalizedLandmark[][]
  canvasWidth: number
  canvasHeight: number
  now: number
  forceBoss?: boolean
}

export function tickGame(state: GameState, input: TickInput, dt: number): GameState {
  if (state.phase !== 'playing' && state.phase !== 'boss') {
    return {
      ...state,
      poseLandmarks: input.poseLandmarks,
      handLandmarks: input.handLandmarks,
      postureScore: input.postureScore,
      particles: updateParticles(state.particles, dt),
    }
  }

  let next: GameState = {
    ...state,
    postureScore: input.postureScore,
    poseLandmarks: input.poseLandmarks,
    handLandmarks: input.handLandmarks,
    particles: updateParticles(state.particles, dt),
    totalPostureSum: state.totalPostureSum + input.postureScore,
    postureSampleCount: state.postureSampleCount + 1,
    bossTimer: state.bossTimer + dt * 1000,
  }

  if (input.postureScore >= POSTURE_GOOD) {
    next.goodPostureSeconds += dt
    next.goodPostureTimer += dt
  } else {
    next.goodPostureTimer = 0
  }

  if (next.phase === 'playing') {
    if (input.postureScore < POSTURE_WARNING) {
      next.slouchTimer += dt
      if (next.slouchTimer >= SLOUCH_GRACE_SEC) {
        next.hp = Math.max(0, next.hp - HP_DRAIN_PER_SEC * dt)
      }
    } else {
      next.slouchTimer = 0
      if (input.postureScore >= POSTURE_GOOD) {
        next.hp = Math.min(MAX_HP, next.hp + HP_REGEN_PER_SEC * dt)
        next.mana = Math.min(MAX_MANA, next.mana + MANA_REGEN_PER_SEC * dt)
      }
    }

    if (next.hp <= 0) {
      return { ...next, phase: 'summary', gameOver: true, hp: 0 }
    }

    if (input.forceBoss || next.bossTimer >= BOSS_INTERVAL_MS) {
      return {
        ...next,
        phase: 'boss',
        bossActive: true,
        bossTimeLeft: BOSS_DURATION_MS / 1000,
        bossGesturesCast: 0,
        bossPostureFailTime: 0,
        bossTimer: 0,
      }
    }
  }

  if (next.phase === 'boss') {
    if (input.postureScore < BOSS_POSTURE_THRESHOLD) {
      next.bossPostureFailTime += dt
      if (next.bossPostureFailTime >= 5) {
        return { ...next, phase: 'summary', gameOver: true, bossActive: false }
      }
    } else {
      next.bossPostureFailTime = 0
      next.mana = Math.min(MAX_MANA, next.mana + MANA_REGEN_PER_SEC * dt)
    }

    next.bossTimeLeft -= dt
    if (next.bossTimeLeft <= 0) {
      const victory =
        next.bossGesturesCast >= BOSS_GESTURE_REQUIRED &&
        next.bossPostureFailTime < 5
      if (victory) {
        next.hp = Math.min(MAX_HP, next.hp + 20)
        next.mana = MAX_MANA
      }
      return {
        ...next,
        phase: 'summary',
        bossActive: false,
        bossVictory: victory,
        gameOver: !victory,
      }
    }
  }

  const canCast =
    input.gesture &&
    input.now - next.lastGestureTime >= GESTURE_DEBOUNCE_MS

  if (canCast && input.gesture) {
    next = castSpell(next, input.gesture, input.canvasWidth, input.canvasHeight)
  }

  return next
}

export function getAveragePosture(state: GameState): number {
  if (state.postureSampleCount === 0) return 0
  return Math.round(state.totalPostureSum / state.postureSampleCount)
}

export function getSessionDurationSec(state: GameState): number {
  if (!state.sessionStart) return 0
  return Math.round((performance.now() - state.sessionStart) / 1000)
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function bossTimeUntilSec(state: GameState): number {
  return Math.max(0, Math.ceil((BOSS_INTERVAL_MS - state.bossTimer) / 1000))
}
