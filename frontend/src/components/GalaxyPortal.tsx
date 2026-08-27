/* ─── GalaxyPortal.tsx — Animated galaxy in the hero section ─────────────────
   A small canvas that draws a rotating three-armed spiral galaxy.
   It appears in the hero section with the "Discover AI Resources" text on top.
   The galaxy is viewed at an angle (like a disk tilted toward you), created by
   squishing the Y axis to 28% of its natural height (sy = 0.28). */

import { useEffect, useRef } from 'react'

/* Each "dot" represents one star particle in a spiral arm.
   arm → which of the 3 arms it belongs to
   t → position along the arm (0 = center, 1 = tip)
   scatter → random sideways offset so arms look fuzzy, not ruler-straight */
type Dot = { arm: number; t: number; size: number; opacity: number; scatter: number }

export function GalaxyPortal() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /* Fixed canvas resolution — CSS scales it to fit the screen */
    const W = 560
    const H = 150
    canvas.width = W
    canvas.height = H

    let frame = 0
    let animId: number

    /* ── Generate spiral arm dots ─────────────────────────────────────────────
       3 arms × 130 dots = 390 total star particles.
       t goes from 0→1 along each arm. At t=0 the dot is near the center;
       at t=1 it's at the outer tip of the arm. */
    const dots: Dot[] = []
    for (let arm = 0; arm < 3; arm++) {
      for (let i = 0; i < 130; i++) {
        dots.push({
          arm,
          t: i / 130,
          /* 88% of stars are tiny; 12% are noticeably larger */
          size: Math.random() < 0.88 ? Math.random() * 1.1 + 0.2 : Math.random() * 2.2 + 1,
          opacity: Math.random() * 0.65 + 0.15,
          scatter: (Math.random() - 0.5) * 20,
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      const cx = W / 2   /* center x */
      const cy = H / 2   /* center y */
      /* rot increases by 0.0014 each frame — the galaxy rotates one full turn
         every (2π / 0.0014) ≈ 4488 frames ≈ 75 seconds */
      const rot = frame * 0.0014
      const sy = 0.28  /* vertical squish — makes the flat disk look angled */

      /* ── Outer diffuse halo ───────────────────────────────────────────────
         A large, very faint blue glow in an ellipse (squished circle via ctx.scale).
         This simulates the dim gas cloud surrounding the galaxy. */
      const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 240)
      outerGlow.addColorStop(0,    'rgba(120, 160, 255, 0.14)')
      outerGlow.addColorStop(0.45, 'rgba(90, 130, 220, 0.05)')
      outerGlow.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1, sy * 1.7)
      ctx.beginPath()
      ctx.arc(0, 0, 240, 0, Math.PI * 2)
      ctx.fillStyle = outerGlow
      ctx.fill()
      ctx.restore()

      /* ── Bright white-blue core ───────────────────────────────────────────
         The galactic center — densely packed stars appear as one bright point.
         Also squished to match the disk angle. */
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26)
      core.addColorStop(0,    'rgba(230, 242, 255, 0.95)')
      core.addColorStop(0.35, 'rgba(180, 210, 255, 0.45)')
      core.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1, sy)
      ctx.beginPath()
      ctx.arc(0, 0, 26, 0, Math.PI * 2)
      ctx.fillStyle = core
      ctx.fill()
      ctx.restore()

      /* ── Spiral arm dots ──────────────────────────────────────────────────
         Each dot's angle = base rotation + arm offset + how far along the arm it is.
         t * Math.PI * 5 = 2.5 full turns along the arm = a tight spiral.
         The perpendicular vector (px, py) is used to scatter dots sideways off the arm.
         Multiplying y by sy squishes the whole galaxy into a disk shape. */
      dots.forEach((d) => {
        /* Spread the 3 arms evenly (0°, 120°, 240°) */
        const armAngle = (d.arm / 3) * Math.PI * 2
        const a = rot + armAngle + d.t * Math.PI * 5
        const r = d.t * 240   /* distance from center grows with t */

        /* Perpendicular direction (rotate 90°) for the scatter offset */
        const px = -Math.sin(a)
        const py = Math.cos(a)

        const x = cx + Math.cos(a) * r + px * d.scatter
        const y = cy + (Math.sin(a) * r + py * d.scatter) * sy

        /* Fade dots in near the center and out at the tips (smooth edges) */
        const fade = d.t < 0.08 ? d.t / 0.08 : d.t > 0.82 ? (1 - d.t) / 0.18 : 1
        const alpha = d.opacity * fade

        ctx.beginPath()
        ctx.arc(x, y, d.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(225, 238, 255, ${alpha})`
        ctx.fill()
      })

      frame++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  /* width: min(560px, 92vw) → never wider than 560px, but shrinks on small screens.
     CSS height stays fixed at 150px regardless of width (the canvas stretches). */
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{ width: 'min(560px, 92vw)', height: '150px' }}
    />
  )
}
