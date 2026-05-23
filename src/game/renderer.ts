import { PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import { postureColor } from '../vision/posture'
import type { GameState } from './engine'
import type { SpellType } from './constants'

const POSE_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS

function drawMirrored(
  ctx: CanvasRenderingContext2D,
  width: number,
  fn: () => void,
) {
  ctx.save()
  ctx.scale(-1, 1)
  ctx.translate(-width, 0)
  fn()
  ctx.restore()
}

function toPixel(
  lm: NormalizedLandmark,
  width: number,
  height: number,
): [number, number] {
  return [lm.x * width, lm.y * height]
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  score: number,
) {
  const color = postureColor(score)
  ctx.lineWidth = 4
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 12

  for (const conn of POSE_CONNECTIONS) {
    const start = landmarks[conn.start]
    const end = landmarks[conn.end]
    if (!start || !end) continue
    if ((start.visibility ?? 1) < 0.5 || (end.visibility ?? 1) < 0.5) continue

    const [sx, sy] = toPixel(start, width, height)
    const [ex, ey] = toPixel(end, width, height)

    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }

  ctx.fillStyle = color
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.5) continue
    const [x, y] = toPixel(lm, width, height)
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.shadowBlur = 0
}

function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
) {
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17],
  ]

  ctx.strokeStyle = 'rgba(196, 181, 253, 0.8)'
  ctx.lineWidth = 2
  for (const [a, b] of connections) {
    const [sx, sy] = toPixel(landmarks[a], width, height)
    const [ex, ey] = toPixel(landmarks[b], width, height)
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }
}

function drawAura(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  spell: SpellType | null,
  time: number,
) {
  if (!spell) return

  const leftShoulder = landmarks[11]
  const rightShoulder = landmarks[12]
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return

  const cx =
    ((leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4) * width
  const cy =
    ((leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4) * height

  const colors: Record<SpellType, string> = {
    shield: 'rgba(96, 165, 250, 0.4)',
    smash: 'rgba(249, 115, 22, 0.4)',
    fireball: 'rgba(239, 68, 68, 0.4)',
    heal: 'rgba(74, 222, 128, 0.4)',
  }

  const pulse = 1 + Math.sin(time * 0.008) * 0.15
  const radius = 90 * pulse

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius)
  grad.addColorStop(0, colors[spell])
  grad.addColorStop(1, 'rgba(0,0,0,0)')

  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: GameState,
) {
  for (const p of state.particles) {
    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawBossDragon(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
) {
  const bob = Math.sin(time * 0.004) * 15
  const cx = width * 0.5
  const cy = height * 0.22 + bob

  ctx.save()
  ctx.globalAlpha = 0.85

  ctx.fillStyle = '#7c3aed'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 90, 50, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#a78bfa'
  ctx.beginPath()
  ctx.ellipse(cx + 70, cy - 10, 45, 30, 0.3, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(cx + 95, cy - 15, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 105, cy - 5, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#c4b5fd'
  ctx.lineWidth = 3
  for (let i = 0; i < 3; i++) {
    const angle = -0.8 + i * 0.4 + Math.sin(time * 0.006 + i) * 0.2
    ctx.beginPath()
    ctx.moveTo(cx - 60, cy - 20)
    ctx.lineTo(cx - 60 - Math.cos(angle) * 40, cy - 20 - Math.sin(angle) * 40)
    ctx.stroke()
  }

  ctx.fillStyle = '#f3e8ff'
  ctx.font = 'bold 22px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('Desk Dragon', cx, cy + 80)

  ctx.restore()
}

export function renderGameFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  time: number,
) {
  ctx.clearRect(0, 0, width, height)

  drawMirrored(ctx, width, () => {
    if (state.poseLandmarks) {
      const spellAge = state.lastSpell ? time - state.lastGestureTime : Infinity
      if (spellAge < 800) {
        drawAura(ctx, state.poseLandmarks, width, height, state.lastSpell, time)
      }
      drawSkeleton(ctx, state.poseLandmarks, width, height, state.postureScore)
    }

    for (const hand of state.handLandmarks) {
      drawHandSkeleton(ctx, hand, width, height)
    }
  })

  drawParticles(ctx, state)

  if (state.phase === 'boss') {
    drawBossDragon(ctx, width, height, time)
  }
}
