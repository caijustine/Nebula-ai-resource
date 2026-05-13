import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchResources } from '../api/resources'
import { CategoryFilter } from '../components/CategoryFilter'
import { ResourceCard } from '../components/ResourceCard'
import { SearchBar } from '../components/SearchBar'
import { SkeletonCard } from '../components/SkeletonCard'
import type { Resource } from '../types/resource'

export function FeedPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    fetchResources()
      .then(setResources)
      .catch(() => setError('Could not load resources. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return resources.filter((r) => {
      const matchesCategory = category === 'All' || r.category === category
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.tags ?? '').toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [resources, search, category])

  return (
    <div className="min-h-screen bg-[#05050f] relative z-10">
      {/* Hero */}
      <div className="relative pt-36 pb-16 px-6 text-center">
        <div className="absolute inset-0 bg-gradient-radial from-blue-950/30 via-transparent to-transparent pointer-events-none" />
        <motion.h1
          className="relative text-5xl md:text-6xl font-bold text-white tracking-tight mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Discover{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            AI Resources
          </span>
        </motion.h1>
        <motion.p
          className="relative text-white/35 text-base mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Community-curated tools, articles, and courses for the AI age
        </motion.p>
        <div className="relative flex justify-center">
          <SearchBar value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Category filter */}
      <div className="px-6 pb-10">
        <CategoryFilter selected={category} onChange={setCategory} />
      </div>

      {/* Resource grid */}
      <div className="px-6 pb-32 max-w-6xl mx-auto">
        {error && (
          <div className="text-center py-20 text-red-400/60 text-sm">{error}</div>
        )}

        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <motion.div
            className="text-center py-28"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-white/15 text-5xl mb-4">✦</p>
            <p className="text-white/35 text-base">No resources found</p>
            <p className="text-white/20 text-sm mt-1">
              {resources.length === 0
                ? 'Be the first to submit one'
                : 'Try a different search or category'}
            </p>
          </motion.div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            <AnimatePresence>
              {filtered.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
