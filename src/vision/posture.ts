import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export interface PostureBaseline {
  shoulderTilt: number
  forwardHead: number
  hipShoulderOffset: number
}

export interface PostureMetrics {
  shoulderTilt: number
  forwardHead: number
  hipShoulderOffset: number
}

const L = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
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
  const leftHip = landmarks[L.LEFT_HIP]
  const rightHip = landmarks[L.RIGHT_HIP]

  if (
    !landmarkVisible(nose) ||
    !landmarkVisible(leftShoulder) ||
    !landmarkVisible(rightShoulder) ||
    !landmarkVisible(leftHip) ||
    !landmarkVisible(rightHip)
  ) {
    return null
  }

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
  const hipMidX = (leftHip.x + rightHip.x) / 2
  const hipMidY = (leftHip.y + rightHip.y) / 2

  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y)
  const forwardHead = Math.abs(nose.x - shoulderMidX)
  const hipShoulderOffset = Math.abs(shoulderMidX - hipMidX) + Math.abs(shoulderMidY - hipMidY) * 0.5

  return { shoulderTilt, forwardHead, hipShoulderOffset }
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
      metrics.hipShoulderOffset * 200
    return Math.max(0, Math.min(100, raw))
  }

  const tiltDev = deviation(metrics.shoulderTilt, baseline.shoulderTilt, 0.08)
  const headDev = deviation(metrics.forwardHead, baseline.forwardHead, 0.12)
  const stackDev = deviation(
    metrics.hipShoulderOffset,
    baseline.hipShoulderOffset,
    0.15,
  )

  const penalty = tiltDev * 35 + headDev * 35 + stackDev * 30
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
      hipShoulderOffset: acc.hipShoulderOffset + s.hipShoulderOffset,
    }),
    { shoulderTilt: 0, forwardHead: 0, hipShoulderOffset: 0 },
  )

  const n = samples.length
  return {
    shoulderTilt: sum.shoulderTilt / n,
    forwardHead: sum.forwardHead / n,
    hipShoulderOffset: sum.hipShoulderOffset / n,
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
