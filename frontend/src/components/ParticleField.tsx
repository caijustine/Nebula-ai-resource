/* ─── ParticleField.tsx — Full-screen animated starfield ─────────────────────
   Renders a <canvas> element fixed behind every page. A canvas is like a blank
   painting surface that we draw on manually using JavaScript, pixel by pixel.
   Every frame (~60 per second) we:
     1. Erase the canvas
     2. Draw faint nebula clouds
     3. Draw twinkling stars
     4. Draw any active shooting stars
   This is called the "animation loop" — it runs continuously via requestAnimationFrame. */

import { useEffect, useRef } from 'react'

/* ── Type definitions ─────────────────────────────────────────────────────────
   TypeScript interfaces define the "shape" of an object — what properties it has
   and what type each property is. These are like blueprints for our data. */

interface Star {
  x: number        /* horizontal position in pixels */
  y: number        /* vertical position in pixels */
  size: number     /* radius in pixels */
  baseOpacity: number  /* brightness at rest */
  phase: number    /* offset into the twinkle cycle — so stars don't all pulse together */
  speed: number    /* how fast this star twinkles */
  color: string    /* partial rgba string (we append the opacity later) */
}

interface ShootingStar {
  x: number        /* current head position */
  y: number
  vx: number       /* velocity: pixels moved right per frame */
  vy: number       /* velocity: pixels moved down per frame */
  life: number     /* current age in frames */
  maxLife: number  /* dies after this many frames */
  length: number   /* trail length in pixels */
}

/* ── Star colors ──────────────────────────────────────────────────────────────
   Partial rgba strings — we'll complete them with the opacity value when drawing.
   Keeping colors near-white makes the sky look realistic (real stars are mostly white). */
const STAR_COLORS = [
  'rgba(245, 248, 255',  // near-white
  'rgba(255, 255, 255',  // pure white
  'rgba(225, 235, 255',  // faint blue-white
  'rgba(200, 218, 255',  // ice blue (the "little blue" touch)
  'rgba(255, 253, 248',  // warm white
]

/* ── Nebula cloud configs ──────────────────────────────────────────────────────
   x, y → center position as a fraction of screen size (0.0–1.0)
   rx, ry → horizontal/vertical radius as a fraction of screen size
   color → RGB values for the radial gradient
   alpha → maximum opacity (very low — these are subtle background clouds) */
const NEBULA_CONFIGS = [
  { x: 0.18, y: 0.38, rx: 0.28, ry: 0.18, color: '160, 185, 230', alpha: 0.016 },
  { x: 0.8,  y: 0.62, rx: 0.24, ry: 0.28, color: '140, 170, 220', alpha: 0.013 },
]

/* ── Shooting star factory ────────────────────────────────────────────────────
   Creates a new ShootingStar object with random position and speed.
   Stars spawn in the top-left half of the screen so their trail (which extends
   behind them toward the left) always stays on-screen. */
function spawnShootingStar(w: number, h: number): ShootingStar {
  const speed = 5 + Math.random() * 5
  return {
    x: Math.random() * w * 0.5,            /* left half of screen */
    y: Math.random() * h * 0.35,           /* top third */
    vx: speed * (0.6 + Math.random() * 0.4),  /* moves right */
    vy: speed * (0.3 + Math.random() * 0.4),  /* moves down */
    life: 0,
    maxLife: 40 + Math.random() * 40,
    length: 60 + Math.random() * 80,
  }
}

export function ParticleField() {
  /* useRef holds a reference to the actual <canvas> DOM element so we can
     call canvas drawing methods on it from inside the useEffect */
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    /* getContext('2d') gives us the 2D drawing API — all the arc(), fill(), etc. methods */
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number   /* stores the ID so we can cancel it on cleanup */
    let frame = 0             /* increments every draw call — used for twinkling math */
    const stars: Star[] = []
    const shooters: ShootingStar[] = []

    /* ── Resize handler ───────────────────────────────────────────────────────
       Canvas pixel dimensions must match the window size. If the canvas is 300×150
       (the default) but CSS makes it fill the screen, everything draws blurry/scaled. */
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    /* ── Star initializer ─────────────────────────────────────────────────────
       Creates one star per ~4000 pixels of screen area. On a 1920×1080 screen
       that's about 518 stars. Each gets a random position, size, and twinkle rhythm. */
    const init = () => {
      stars.length = 0
      const count = Math.floor((canvas.width * canvas.height) / 4000)
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          /* 92% of stars are tiny (0.2–1.4px); 8% are larger "bright" stars */
          size: Math.random() < 0.92 ? Math.random() * 1.2 + 0.2 : Math.random() * 2.5 + 1.2,
          baseOpacity: Math.random() * 0.5 + 0.2,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.015 + 0.005,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        })
      }
    }

    /* ── Nebula cloud drawing ─────────────────────────────────────────────────
       For each nebula config we:
         1. Save the canvas transform state (ctx.save)
         2. Move the origin to the nebula center (ctx.translate)
         3. Squish/stretch the coordinate space to create an ellipse (ctx.scale)
         4. Draw a circle that becomes an ellipse due to the scale
         5. Restore the original transform (ctx.restore) */
    const drawNebulae = () => {
      NEBULA_CONFIGS.forEach((n) => {
        const cx = n.x * canvas.width
        const cy = n.y * canvas.height
        const rx = n.rx * canvas.width
        const ry = n.ry * canvas.height
        const r = Math.max(rx, ry)

        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(rx / r, ry / r)  /* squish/stretch to make a circle into an ellipse */

        /* createRadialGradient(x0,y0,r0, x1,y1,r1): a gradient from inner circle to outer.
           addColorStop(position, color): 0=center, 1=edge. Fades from dim to transparent. */
        const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
        grd.addColorStop(0,   `rgba(${n.color}, ${n.alpha})`)
        grd.addColorStop(0.5, `rgba(${n.color}, ${n.alpha * 0.4})`)
        grd.addColorStop(1,   `rgba(${n.color}, 0)`)

        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
        ctx.restore()
      })
    }

    /* ── Star drawing ─────────────────────────────────────────────────────────
       Math.sin oscillates between -1 and +1 as `frame` increases.
       Multiplying by speed and adding phase makes each star twinkle at its own rate.
       The result: opacity = baseOpacity × (0.6 to 1.0) — a gentle pulse. */
    const drawStars = () => {
      stars.forEach((s) => {
        const opacity = s.baseOpacity * (0.6 + 0.4 * Math.sin(frame * s.speed + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `${s.color}, ${opacity})`
        ctx.fill()
        /* Larger stars get an extra soft glow halo — a larger transparent circle */
        if (s.size > 1.5) {
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4)
          glow.addColorStop(0, `${s.color}, ${opacity * 0.4})`)
          glow.addColorStop(1, `${s.color}, 0)`)
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }
      })
    }

    /* ── Shooting star drawing ────────────────────────────────────────────────
       We iterate in reverse (i--) so we can safely splice (remove) elements
       from the array without skipping any.
       The tail is drawn as a line from behind the head, using a linear gradient
       that fades from transparent at the tail to bright white at the head.
       alpha fades in at the start of life and out at the end (0–20% and 80–100%). */
    const drawShooters = () => {
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i]
        const progress = s.life / s.maxLife
        /* Fade in during first 20% of life, fade out during last 20% */
        const alpha = progress < 0.2
          ? progress / 0.2
          : progress > 0.8 ? (1 - progress) / 0.2 : 1

        /* Math.hypot computes the length of the velocity vector (speed).
           Dividing by it normalizes to a unit direction vector. */
        const tailX = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.length * alpha
        const tailY = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.length * alpha

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y)
        grad.addColorStop(0, `rgba(255,255,255,0)`)          /* transparent tail */
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.9})`)  /* bright head */

        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(s.x, s.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.stroke()

        /* Move the star and age it */
        s.x += s.vx
        s.y += s.vy
        s.life++
        /* Remove if lifespan exceeded OR if it flew off-screen */
        if (s.life >= s.maxLife || s.x > canvas.width + 60 || s.y > canvas.height + 60) {
          shooters.splice(i, 1)
        }
      }
    }

    /* ── Main animation loop ──────────────────────────────────────────────────
       clearRect wipes the canvas clean each frame (otherwise drawings stack up).
       requestAnimationFrame schedules the next frame ~16ms later (60fps target).
       Every 180 frames (~3 seconds) there's a 60% chance a shooting star spawns. */
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawNebulae()
      drawStars()
      drawShooters()
      if (frame % 180 === 0 && Math.random() < 0.6) {
        shooters.push(spawnShootingStar(canvas.width, canvas.height))
      }
      frame++
      animationId = requestAnimationFrame(draw)
    }

    resize()
    init()
    draw()

    /* Re-initialize stars when the window is resized (their positions are pixel-based) */
    const handleResize = () => { resize(); init() }
    window.addEventListener('resize', handleResize)

    /* Cleanup: cancel the animation loop and remove the resize listener
       when this component unmounts (e.g. if the page is closed) */
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  /* The canvas is fixed, covers the whole screen, and sits behind everything (z-0).
     pointer-events-none means mouse clicks pass through it to the content above. */
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  )
}
