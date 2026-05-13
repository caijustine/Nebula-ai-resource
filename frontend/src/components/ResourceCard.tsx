import { motion } from 'framer-motion'
import type { Resource } from '../types/resource'

const CATEGORY_STYLES: Record<string, { border: string; badge: string }> = {
  Tools: { border: 'border-blue-500/30 hover:border-blue-400/50', badge: 'bg-blue-500/15 text-blue-300' },
  Articles: { border: 'border-purple-500/30 hover:border-purple-400/50', badge: 'bg-purple-500/15 text-purple-300' },
  Videos: { border: 'border-pink-500/30 hover:border-pink-400/50', badge: 'bg-pink-500/15 text-pink-300' },
  Courses: { border: 'border-cyan-500/30 hover:border-cyan-400/50', badge: 'bg-cyan-500/15 text-cyan-300' },
  'Research Papers': { border: 'border-indigo-500/30 hover:border-indigo-400/50', badge: 'bg-indigo-500/15 text-indigo-300' },
  Tutorials: { border: 'border-green-500/30 hover:border-green-400/50', badge: 'bg-green-500/15 text-green-300' },
  Datasets: { border: 'border-orange-500/30 hover:border-orange-400/50', badge: 'bg-orange-500/15 text-orange-300' },
  Models: { border: 'border-violet-500/30 hover:border-violet-400/50', badge: 'bg-violet-500/15 text-violet-300' },
  Other: { border: 'border-slate-500/30 hover:border-slate-400/50', badge: 'bg-slate-500/15 text-slate-300' },
}

const DEFAULT_STYLES = { border: 'border-white/10 hover:border-white/20', badge: 'bg-white/10 text-white/50' }

interface Props {
  resource: Resource
  onDelete?: (id: number) => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ResourceCard({ resource, onDelete }: Props) {
  const styles = resource.category
    ? (CATEGORY_STYLES[resource.category] ?? DEFAULT_STYLES)
    : DEFAULT_STYLES

  const tags = resource.tags
    ? resource.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      className={`group relative rounded-2xl border ${styles.border} bg-white/[0.03] backdrop-blur-sm p-5 flex flex-col gap-3 transition-all duration-200`}
    >
      {/* shimmer overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 flex-1">
          {resource.title}
        </h3>
        {resource.category && (
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
            {resource.category}
          </span>
        )}
      </div>

      {resource.description && (
        <p className="text-white/45 text-sm leading-relaxed line-clamp-3">
          {resource.description}
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-white/35 border border-white/[0.07]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.05]">
        <p className="text-xs text-white/25">
          {resource.submitter_name && (
            <span className="text-white/40">{resource.submitter_name} · </span>
          )}
          {formatDate(resource.created_at)}
        </p>

        <div className="flex items-center gap-2">
          {onDelete && (
            <motion.button
              onClick={() => onDelete(resource.id)}
              className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-400/40 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Delete
            </motion.button>
          )}
          <motion.a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-white/60 hover:bg-white/[0.12] hover:text-white transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Visit →
          </motion.a>
        </div>
      </div>
    </motion.div>
  )
}
