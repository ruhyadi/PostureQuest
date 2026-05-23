export const MAX_HP = 100
export const MAX_MANA = 100

export const POSTURE_GOOD = 75
export const POSTURE_WARNING = 40
export const BOSS_POSTURE_THRESHOLD = 60

export const HP_DRAIN_PER_SEC = 1
export const HP_REGEN_PER_SEC = 0.5
export const MANA_REGEN_PER_SEC = 20
export const SLOUCH_GRACE_SEC = 3

export const SPELL_MANA_COST = 25
export const GESTURE_DEBOUNCE_MS = 500

export const CALIBRATION_DURATION_MS = 10_000
export const BOSS_INTERVAL_MS = 25 * 60 * 1000
export const BOSS_DURATION_MS = 60_000
export const BOSS_GESTURE_REQUIRED = 3

export const CAMERA_WIDTH = 640
export const CAMERA_HEIGHT = 480

export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

export const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

export const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export type GamePhase =
  | 'landing'
  | 'loading'
  | 'calibration'
  | 'playing'
  | 'boss'
  | 'summary'

export type GestureType = 'open_palm' | 'fist' | 'point' | 'peace' | null

export type SpellType = 'shield' | 'smash' | 'fireball' | 'heal'

export const GESTURE_TO_SPELL: Record<Exclude<GestureType, null>, SpellType> = {
  open_palm: 'shield',
  fist: 'smash',
  point: 'fireball',
  peace: 'heal',
}

export const SPELL_LABELS: Record<SpellType, string> = {
  shield: 'Shield',
  smash: 'Smash',
  fireball: 'Fireball',
  heal: 'Heal',
}
