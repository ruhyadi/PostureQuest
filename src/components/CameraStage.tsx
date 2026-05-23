import { forwardRef, type RefObject } from 'react'
import { CAMERA_HEIGHT, CAMERA_WIDTH } from '../game/constants'

interface CameraStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
}

export const CameraStage = forwardRef<HTMLVideoElement, CameraStageProps>(
  function CameraStage({ canvasRef }, videoRef) {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/40 shadow-2xl shadow-purple-900/50">
        <video
          ref={videoRef}
          className="block scale-x-[-1] bg-black"
          width={CAMERA_WIDTH}
          height={CAMERA_HEIGHT}
          playsInline
          muted
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={CAMERA_WIDTH}
          height={CAMERA_HEIGHT}
        />
      </div>
    )
  },
)
