import { motion } from 'framer-motion'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <motion.div
      className="relative w-full max-w-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-base select-none">
        ⌕
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, description, or tags..."
        className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-sm"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}
