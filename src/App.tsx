import { useCallback, useEffect, useState } from 'react'
import { BossOverlay } from './components/BossOverlay'
import { CalibrationModal } from './components/CalibrationModal'
import { CameraStage } from './components/CameraStage'
import { GameHUD } from './components/GameHUD'
import { RunSummary } from './components/RunSummary'
import type { GamePhase } from './game/constants'
import { useCalibration, useGameLoop } from './hooks/useGameLoop'

function App() {
  const [phase, setPhase] = useState<GamePhase>('landing')
  const [forceBoss, setForceBoss] = useState(false)
  const calibration = useCalibration()

  const handlePhaseChange = useCallback((next: GamePhase) => {
    setPhase(next)
    if (next === 'playing') setForceBoss(false)
  }, [])

  const {
    gameState,
    modelsLoading,
    modelsError,
    cameraError,
    cameraReady,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    startSession,
    resetGame,
    bossTimeUntil,
  } = useGameLoop(
    phase,
    handlePhaseChange,
    calibration.baseline,
    calibration.addSample,
    forceBoss,
  )

  useEffect(() => {
    if (phase === 'calibration') {
      calibration.startCalibration()
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'calibration' && calibration.isComplete) {
      setPhase('playing')
    }
  }, [phase, calibration.isComplete])

  const handleStart = async () => {
    if (modelsLoading || modelsError) return
    setPhase('loading')
    const ok = await startCamera()
    if (ok) {
      startSession()
      setPhase('calibration')
    } else {
      setPhase('landing')
    }
  }

  const handleRestart = () => {
    resetGame()
    calibration.startCalibration()
    setForceBoss(false)
    setPhase('calibration')
  }

  const handleEndSession = () => {
    stopCamera()
    resetGame()
    setForceBoss(false)
    setPhase('landing')
  }

  const showGame =
    (phase === 'calibration' || phase === 'playing' || phase === 'boss') &&
    cameraReady &&
    !modelsError

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0a1a] via-[#1a0f2e] to-[#0f0a1a]">
      <header className="border-b border-purple-500/20 px-6 py-4 text-center">
        <h1 className="bg-gradient-to-r from-purple-300 via-violet-200 to-amber-200 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          PostureQuest
        </h1>
        <p className="mt-1 text-sm text-purple-400">
          Your body is the controller. Sit tall. Cast spells. Defeat the Desk Dragon.
        </p>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-8 lg:flex-row lg:items-start lg:justify-center">
        {phase === 'landing' && !cameraError && (
          <div className="flex min-h-[480px] w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-950/60 p-8 text-center">
            <div className="mb-4 text-5xl">⚔️</div>
            <h2 className="mb-3 text-2xl font-bold text-purple-100">Begin Your Quest</h2>
            <p className="mb-6 text-purple-300">
              Grant camera access to turn your webcam into a wellness RPG. All processing
              happens locally in your browser.
            </p>
            <button
              type="button"
              onClick={handleStart}
              disabled={modelsLoading || !!modelsError}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 px-8 py-3 font-bold text-white shadow-lg transition hover:from-purple-500 hover:to-violet-400 disabled:opacity-50"
            >
              {modelsLoading ? 'Loading models…' : 'Start Quest'}
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex min-h-[480px] w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-950/60 p-8 text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            <h2 className="text-xl font-bold text-purple-100">Starting camera…</h2>
            <p className="mt-2 text-sm text-purple-400">Allow webcam access when prompted</p>
          </div>
        )}

        {modelsError && (
          <div className="w-full max-w-lg rounded-2xl border border-red-500/40 bg-red-950/60 p-6 text-center">
            <h2 className="font-bold text-red-300">Model load failed</h2>
            <p className="mt-2 text-sm text-red-200">{modelsError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm text-white"
            >
              Retry
            </button>
          </div>
        )}

        {cameraError && phase === 'landing' && (
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-amber-950/40 p-6 text-center">
            <h2 className="font-bold text-amber-300">Camera unavailable</h2>
            <p className="mt-2 text-sm text-amber-100">{cameraError}</p>
            <p className="mt-2 text-xs text-amber-200/80">
              PostureQuest needs a webcam to track your skeleton. Check browser permissions
              and try again.
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {showGame && (
          <>
            <div className="relative">
              <CameraStage ref={videoRef} canvasRef={canvasRef} />
              <CalibrationModal
                visible={phase === 'calibration'}
                progress={calibration.progress}
              />
              <BossOverlay
                visible={phase === 'boss'}
                timeLeft={gameState.bossTimeLeft}
                gesturesCast={gameState.bossGesturesCast}
                postureScore={gameState.postureScore}
              />
            </div>
            <div className="flex w-full max-w-xs flex-col gap-3">
              <GameHUD
                state={gameState}
                bossTimeUntil={bossTimeUntil}
                onSkipToBoss={() => setForceBoss(true)}
              />
              <button
                type="button"
                onClick={handleEndSession}
                className="rounded-lg border border-purple-500/30 px-3 py-2 text-xs text-purple-400 transition hover:bg-purple-900/50 hover:text-purple-200"
              >
                End session
              </button>
            </div>
          </>
        )}

        {phase === 'summary' && (
          <RunSummary state={gameState} onRestart={handleRestart} />
        )}
      </main>
    </div>
  )
}

export default App
