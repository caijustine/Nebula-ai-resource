import { motion } from 'framer-motion'
import { CATEGORIES } from '../types/resource'

interface Props {
  selected: string
  onChange: (category: string) => void
}

export function CategoryFilter({ selected, onChange }: Props) {
  const all = ['All', ...CATEGORIES]

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {all.map((cat) => (
        <motion.button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            selected === cat
              ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-sm shadow-blue-500/20'
              : 'bg-white/[0.04] border-white/10 text-white/45 hover:bg-white/[0.08] hover:text-white/70'
          }`}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          {cat}
        </motion.button>
      ))}
    </div>
  )
}
