/* ─── ClickRipple.tsx — Click ring effect ────────────────────────────────────
   This component has no visible HTML of its own — it returns null.
   Its only job is to attach a global click listener to the window that creates
   an expanding ring animation wherever you click on the page.

   Why attach to the window instead of a specific element?
   Because we want EVERY click anywhere on the page to trigger it. */

import { useEffect } from 'react'

export function ClickRipple() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      /* Pick a random indigo/purple/blue color for variety */
      const colors = [
        'rgba(99,102,241,0.6)',
        'rgba(139,92,246,0.6)',
        'rgba(59,130,246,0.6)',
        'rgba(167,139,250,0.6)',
      ]
      const color = colors[Math.floor(Math.random() * colors.length)]

      /* Random size between 60–120px so rings don't all look identical */
      const size = 60 + Math.random() * 60

      /* Imperatively create a DOM element — we don't use React state here because
         these rings are purely visual and short-lived. Creating them through the DOM
         directly is simpler and faster than going through React's render cycle. */
      const ring = document.createElement('div')
      ring.style.cssText = `
        position: fixed;
        left: ${e.clientX - size / 2}px;
        top: ${e.clientY - size / 2}px;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 2px solid ${color};
        pointer-events: none;
        z-index: 9999;
        animation: ripple-out 0.6s ease-out forwards;
      `
      /* The `ripple-out` @keyframes is defined in index.css — it expands and fades out */
      document.body.appendChild(ring)

      /* Once the CSS animation finishes, remove the div from the DOM so it
         doesn't accumulate hundreds of invisible elements over time */
      ring.addEventListener('animationend', () => ring.remove())
    }

    window.addEventListener('click', handleClick)
    /* Cleanup: remove the listener if this component ever unmounts */
    return () => window.removeEventListener('click', handleClick)
  }, [])

  /* Returns null — this component renders nothing itself */
  return null
}
