/* ─── Navbar.tsx — Fixed top navigation bar ──────────────────────────────────
   This component always sits at the top of the screen (position: fixed).
   It has two parts:
     Left: the "nebula" logo, which opens a dropdown menu when clicked
     Right: the "Submit Resource" button

   Props:
     onOpenChat → called when the user clicks "Ask Nebula" in the dropdown.
                  App.tsx uses this to set chatOpen = true, which renders ChatPanel.

   State:
     scrolled → becomes true once you scroll 20px down, switches on the blurred background
     menuOpen → controls whether the dropdown is visible */

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

interface NavbarProps {
  onOpenChat?: () => void
}

export function Navbar({ onOpenChat }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? 'bg-[#02030a]/90 backdrop-blur-xl border-b border-white/[0.04]'
          : 'bg-transparent'
      }`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ── Logo + dropdown ─────────────────────────────────────────────── */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 group"
        >
          <motion.span
            className="text-blue-400 text-xl"
            style={{ filter: 'drop-shadow(0 0 8px rgba(96,165,250,0.9))' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            ✦
          </motion.span>
          <span className="text-white font-semibold tracking-tight text-lg glow-blue">
            nebula
          </span>
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="absolute top-full left-0 mt-3 w-44 rounded-xl bg-[#06060f]/95 backdrop-blur-xl border border-white/[0.07] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.14 }}
            >
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/[0.05] text-sm transition-colors"
              >
                <span className="text-white/25 text-xs">✦</span>
                Feed
              </Link>
              <div className="h-px bg-white/[0.05]" />
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/[0.05] text-sm transition-colors"
              >
                <span className="text-white/25 text-xs">⚙</span>
                Admin
              </Link>
              <div className="h-px bg-white/[0.05]" />
              {/* Ask Nebula: closes the dropdown and opens the chat panel */}
              <button
                onClick={() => { setMenuOpen(false); onOpenChat?.() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/[0.05] text-sm transition-colors"
              >
                <span className="text-fuchsia-400/50 text-xs">✦</span>
                Ask Nebula
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Submit Resource button ───────────────────────────────────────── */}
      <motion.button
        onClick={() => navigate('/submit')}
        className="px-4 py-2 rounded-lg bg-fuchsia-950/40 border border-fuchsia-500/28 text-fuchsia-200/85 text-sm font-medium hover:bg-fuchsia-900/40 hover:border-fuchsia-400/50 hover:text-fuchsia-100 transition-all"
        style={{
          boxShadow: '0 0 10px rgba(232,121,249,0.30), 0 0 26px rgba(192,132,252,0.16), 0 0 55px rgba(139,92,246,0.08)',
          textShadow: '0 0 10px rgba(245,183,255,0.70), 0 0 24px rgba(216,148,253,0.38)',
        }}
        whileHover={{ scale: 1.06, boxShadow: '0 0 14px rgba(232,121,249,0.55), 0 0 32px rgba(192,132,252,0.30), 0 0 65px rgba(139,92,246,0.14)' }}
        whileTap={{ scale: 0.95 }}
      >
        Submit Resource
      </motion.button>
    </motion.nav>
  )
}
