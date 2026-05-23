import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  HandLandmarkerResult,
  PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import {
  bossTimeUntilSec,
  createInitialState,
  tickGame,
  type GameState,
} from '../game/engine'
import { renderGameFrame } from '../game/renderer'
import { CAMERA_HEIGHT, CAMERA_WIDTH } from '../game/constants'
import { detectBestGesture } from '../vision/gestures'
import {
  averageBaseline,
  extractPostureMetrics,
  scorePosture,
  type PostureBaseline,
} from '../vision/posture'
import {
  detectHands,
  detectPose,
  initVisionModels,
  type VisionModels,
} from '../vision/mediapipe'

export interface GameLoopRefs {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export function useGameLoop(
  phase: GameState['phase'],
  onPhaseChange: (phase: GameState['phase']) => void,
  baseline: PostureBaseline | null,
  onCalibrationSample: (metrics: ReturnType<typeof extractPostureMetrics>) => void,
  forceBoss: boolean,
) {
  const [gameState, setGameState] = useState<GameState>(createInitialState)
  const [models, setModels] = useState<VisionModels | null>(null)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pendingStreamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const frameSkipRef = useRef(0)
  const stateRef = useRef<GameState>(createInitialState())
  const phaseRef = useRef(phase)
  const baselineRef = useRef(baseline)
  const forceBossRef = useRef(forceBoss)

  phaseRef.current = phase
  baselineRef.current = baseline
  forceBossRef.current = forceBoss

  useEffect(() => {
    let cancelled = false
    initVisionModels()
      .then((m) => {
        if (!cancelled) setModels(m)
      })
      .catch((err) => {
        if (!cancelled) {
          setModelsError(
            err instanceof Error ? err.message : 'Failed to load vision models',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const attachStreamToVideo = useCallback(async (stream: MediaStream): Promise<boolean> => {
    const video = videoRef.current
    if (!video) {
      pendingStreamRef.current = stream
      return true
    }

    video.srcObject = stream
    try {
      await video.play()
      setCameraReady(true)
      return true
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop())
      setCameraError(
        err instanceof Error ? err.message : 'Could not start camera preview.',
      )
      return false
    }
  }, [])

  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera API unavailable. Use HTTPS or localhost, not a plain HTTP URL.',
      )
      return false
    }

    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CAMERA_WIDTH },
          height: { ideal: CAMERA_HEIGHT },
          facingMode: 'user',
        },
        audio: false,
      })

      return attachStreamToVideo(stream)
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      const message =
        name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in your browser settings, then try again.'
          : name === 'NotFoundError'
            ? 'No camera found. Connect a webcam and try again.'
            : name === 'NotReadableError'
              ? 'Camera is in use by another app. Close other apps using the webcam and try again.'
              : err instanceof Error
                ? err.message
                : 'Camera access denied. Please allow webcam permissions.'
      setCameraError(message)
      return false
    }
  }, [attachStreamToVideo])

  useEffect(() => {
    const pending = pendingStreamRef.current
    if (!pending || cameraReady) return

    void attachStreamToVideo(pending).then((ok) => {
      if (ok) pendingStreamRef.current = null
    })
  }, [attachStreamToVideo, cameraReady, phase])

  const stopCamera = useCallback(() => {
    pendingStreamRef.current?.getTracks().forEach((t) => t.stop())
    pendingStreamRef.current = null

    const video = videoRef.current
    if (video?.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
    setCameraReady(false)
  }, [])

  useEffect(() => {
    if (!models || !cameraReady) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CAMERA_WIDTH
    canvas.height = CAMERA_HEIGHT

    let poseResult: PoseLandmarkerResult | null = null
    let handResult: HandLandmarkerResult | null = null

    const loop = (time: number) => {
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0
      lastTimeRef.current = time

      frameSkipRef.current += 1
      if (frameSkipRef.current % 2 === 0 && video.readyState >= 2) {
        poseResult = detectPose(models, video, time)
        handResult = detectHands(models, video, time)
      }

      const poseLandmarks = poseResult?.landmarks[0] ?? null
      const handLandmarks = handResult?.landmarks ?? []

      let postureScore = 0
      if (poseLandmarks) {
        const metrics = extractPostureMetrics(poseLandmarks)
        if (metrics) {
          if (phaseRef.current === 'calibration') {
            onCalibrationSample(metrics)
          }
          postureScore = scorePosture(metrics, baselineRef.current)
        }
      }

      const gesture = detectBestGesture(handLandmarks)

      const prev = stateRef.current
      const next = tickGame(
        { ...prev, phase: phaseRef.current },
        {
          postureScore,
          gesture,
          poseLandmarks,
          handLandmarks,
          canvasWidth: CAMERA_WIDTH,
          canvasHeight: CAMERA_HEIGHT,
          now: time,
          forceBoss: forceBossRef.current,
        },
        Math.min(dt, 0.1),
      )

      if (next.phase !== prev.phase) {
        onPhaseChange(next.phase)
      }

      stateRef.current = next
      setGameState(next)
      renderGameFrame(ctx, next, CAMERA_WIDTH, CAMERA_HEIGHT, time)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(rafRef.current)
  }, [models, cameraReady, onPhaseChange, onCalibrationSample])

  const resetGame = useCallback(() => {
    const fresh = createInitialState()
    stateRef.current = fresh
    setGameState(fresh)
    lastTimeRef.current = 0
  }, [])

  const startSession = useCallback(() => {
    const next = {
      ...createInitialState(),
      phase: 'calibration' as const,
      sessionStart: performance.now(),
    }
    stateRef.current = next
    setGameState(next)
  }, [])

  return {
    gameState,
    models,
    modelsLoading: !models && !modelsError,
    modelsError,
    cameraError,
    cameraReady,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    startSession,
    resetGame,
    bossTimeUntil: bossTimeUntilSec(gameState),
  }
}

export function useCalibration() {
  const [samples, setSamples] = useState<ReturnType<typeof extractPostureMetrics>[]>(
    [],
  )
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const startCalibration = useCallback(() => {
    setSamples([])
    setStartedAt(performance.now())
  }, [])

  const addSample = useCallback(
    (metrics: ReturnType<typeof extractPostureMetrics>) => {
      if (!metrics) return
      setSamples((prev) => [...prev, metrics])
    },
    [],
  )

  const baseline = averageBaseline(
    samples.filter((s): s is NonNullable<typeof s> => s !== null),
  )

  const progress =
    startedAt === null
      ? 0
      : Math.min(1, (performance.now() - startedAt) / 10_000)

  const isComplete = progress >= 1 && baseline !== null

  return { baseline, progress, isComplete, startCalibration, addSample, samples }
}
