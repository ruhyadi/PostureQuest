import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export interface PostureBaseline {
  shoulderTilt: number
  forwardHead: number
  headDrop: number
}

export interface PostureMetrics {
  shoulderTilt: number
  forwardHead: number
  headDrop: number
}

const L = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
} as const

function landmarkVisible(lm: NormalizedLandmark): boolean {
  return (lm.visibility ?? 1) > 0.5
}

export function extractPostureMetrics(
  landmarks: NormalizedLandmark[],
): PostureMetrics | null {
  const nose = landmarks[L.NOSE]
  const leftShoulder = landmarks[L.LEFT_SHOULDER]
  const rightShoulder = landmarks[L.RIGHT_SHOULDER]

  if (
    !landmarkVisible(nose) ||
    !landmarkVisible(leftShoulder) ||
    !landmarkVisible(rightShoulder)
  ) {
    return null
  }

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2

  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y)
  const forwardHead = Math.abs(nose.x - shoulderMidX)
  const headDrop = Math.max(0, nose.y - shoulderMidY)

  return { shoulderTilt, forwardHead, headDrop }
}

function deviation(current: number, baseline: number, scale: number): number {
  return Math.min(1, Math.abs(current - baseline) / scale)
}

export function scorePosture(
  metrics: PostureMetrics,
  baseline: PostureBaseline | null,
): number {
  if (!baseline) {
    const raw =
      100 -
      metrics.shoulderTilt * 400 -
      metrics.forwardHead * 300 -
      metrics.headDrop * 350
    return Math.max(0, Math.min(100, raw))
  }

  const tiltDev = deviation(metrics.shoulderTilt, baseline.shoulderTilt, 0.08)
  const headDev = deviation(metrics.forwardHead, baseline.forwardHead, 0.12)
  const dropDev = deviation(metrics.headDrop, baseline.headDrop, 0.1)

  const penalty = tiltDev * 35 + headDev * 35 + dropDev * 30
  return Math.max(0, Math.min(100, 100 - penalty))
}

export function averageBaseline(
  samples: PostureMetrics[],
): PostureBaseline | null {
  if (samples.length === 0) return null

  const sum = samples.reduce(
    (acc, s) => ({
      shoulderTilt: acc.shoulderTilt + s.shoulderTilt,
      forwardHead: acc.forwardHead + s.forwardHead,
      headDrop: acc.headDrop + s.headDrop,
    }),
    { shoulderTilt: 0, forwardHead: 0, headDrop: 0 },
  )

  const n = samples.length
  return {
    shoulderTilt: sum.shoulderTilt / n,
    forwardHead: sum.forwardHead / n,
    headDrop: sum.headDrop / n,
  }
}

export function postureColor(score: number): string {
  if (score >= 75) return '#4ade80'
  if (score >= 40) return '#facc15'
  return '#f87171'
}

export function postureLabel(score: number): string {
  if (score >= 75) return 'Aligned'
  if (score >= 40) return 'Drifting'
  return 'Slouching'
}
