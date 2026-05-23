import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type HandLandmarkerResult,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import { HAND_MODEL, POSE_MODEL, WASM_CDN } from '../game/constants'

export interface VisionModels {
  poseLandmarker: PoseLandmarker
  handLandmarker: HandLandmarker
}

export async function initVisionModels(): Promise<VisionModels> {
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN)

  const [poseLandmarker, handLandmarker] = await Promise.all([
    PoseLandmarker.createFromModelPath(vision, POSE_MODEL),
    HandLandmarker.createFromModelPath(vision, HAND_MODEL),
  ])

  await poseLandmarker.setOptions({
    runningMode: 'VIDEO',
    numPoses: 1,
  })

  await handLandmarker.setOptions({
    runningMode: 'VIDEO',
    numHands: 2,
  })

  return { poseLandmarker, handLandmarker }
}

export function detectPose(
  models: VisionModels,
  video: HTMLVideoElement,
  timestamp: number,
): PoseLandmarkerResult {
  return models.poseLandmarker.detectForVideo(video, timestamp)
}

export function detectHands(
  models: VisionModels,
  video: HTMLVideoElement,
  timestamp: number,
): HandLandmarkerResult {
  return models.handLandmarker.detectForVideo(video, timestamp)
}
