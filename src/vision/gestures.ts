import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { GestureType } from '../game/constants'

const FINGER = {
  INDEX: { tip: 8, pip: 6 },
  MIDDLE: { tip: 12, pip: 10 },
  RING: { tip: 16, pip: 14 },
  PINKY: { tip: 20, pip: 18 },
} as const

function fingerExtended(
  landmarks: NormalizedLandmark[],
  tipIdx: number,
  pipIdx: number,
): boolean {
  const wrist = landmarks[0]
  const tip = landmarks[tipIdx]
  const pip = landmarks[pipIdx]
  const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y)
  const pipDist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y)
  return tipDist > pipDist * 1.05
}

export function detectGesture(
  landmarks: NormalizedLandmark[] | undefined,
): GestureType {
  if (!landmarks || landmarks.length < 21) return null

  const index = fingerExtended(landmarks, FINGER.INDEX.tip, FINGER.INDEX.pip)
  const middle = fingerExtended(landmarks, FINGER.MIDDLE.tip, FINGER.MIDDLE.pip)
  const ring = fingerExtended(landmarks, FINGER.RING.tip, FINGER.RING.pip)
  const pinky = fingerExtended(landmarks, FINGER.PINKY.tip, FINGER.PINKY.pip)

  const extendedCount = [index, middle, ring, pinky].filter(Boolean).length

  if (index && middle && !ring && !pinky) return 'peace'
  if (index && !middle && !ring && !pinky) return 'point'
  if (extendedCount === 0) return 'fist'
  if (extendedCount >= 3) return 'open_palm'

  return null
}

export function detectBestGesture(
  handLandmarks: NormalizedLandmark[][],
): GestureType {
  for (const hand of handLandmarks) {
    const gesture = detectGesture(hand)
    if (gesture) return gesture
  }
  return null
}
