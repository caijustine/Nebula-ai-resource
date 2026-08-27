/* ─── CategoryFilter.tsx — Category pill buttons ─────────────────────────────
   Renders a row of pill-shaped buttons — one for "All" plus one per category.
   Props (inputs the parent passes in):
     selected → which category is currently active
     onChange → a function to call when a different pill is clicked
   When you click a pill, onChange updates the `category` state in FeedPage,
   which triggers the filter logic there. */

import { motion } from 'framer-motion'
import { CATEGORIES } from '../types/resource'

interface Props {
  selected: string
  onChange: (category: string) => void
}

export function CategoryFilter({ selected, onChange }: Props) {
  /* Prepend "All" to the categories list so it appears as the first pill */
  const all = ['All', ...CATEGORIES]

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {all.map((cat) => (
        /* motion.button is Framer Motion's animated button.
           key={cat} is required by React when rendering a list — helps it track changes.
           whileHover/whileTap add subtle scale animations on interaction. */
        <motion.button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            /* Ternary: if this pill is selected, use the active style; otherwise use the default */
            selected === cat
              ? 'bg-fuchsia-950/50 border-fuchsia-500/30 text-fuchsia-200/90'
              : 'bg-white/[0.04] border-white/10 text-white/45 hover:bg-white/[0.08] hover:text-white/70'
          }`}
          /* Selected pills glow with nebula purple-pink — bright, like a lit star */
          style={selected === cat ? {
            boxShadow: '0 0 10px rgba(232,121,249,0.32), 0 0 22px rgba(192,132,252,0.18), 0 0 45px rgba(139,92,246,0.09)',
            textShadow: '0 0 9px rgba(245,183,255,0.72), 0 0 20px rgba(216,148,253,0.38)',
          } : undefined}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          {cat}
        </motion.button>
      ))}
    </div>
  )
}
