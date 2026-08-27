/* ─── FeedPage.tsx — Main resource listing page ───────────────────────────────
   This is the home page ("/"). It does three things:
     1. Fetches all resources from the backend API when the page loads
     2. Filters the list in real-time as the user types or changes category
     3. Renders the hero section (Nebula title + galaxy), the search/filter bar,
        and the grid of resource cards */

import { useEffect, useMemo, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchResources } from '../api/resources'
import { CategoryFilter } from '../components/CategoryFilter'
import { GalaxyPortal } from '../components/GalaxyPortal'
import { ResourceCard } from '../components/ResourceCard'
import { SearchBar } from '../components/SearchBar'
import { SkeletonCard } from '../components/SkeletonCard'
import type { Resource } from '../types/resource'

export function FeedPage() {
  /* ── State variables ──────────────────────────────────────────────────────
     useState gives us reactive variables — when they change, the component
     automatically re-renders to show the updated UI.
     resources: the full list fetched from the API
     loading: true while the API call is in progress (shows skeleton cards)
     error: holds an error message if the fetch fails
     search: whatever the user typed in the search box
     category: the currently selected category pill ("All", "Tool", etc.) */
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  /* ── Nebula wave animation ────────────────────────────────────────────────
     Toggling the `nebula-wave-active` class on the h1 re-triggers CSS
     keyframe animations on each letter span. void el.offsetHeight forces the
     browser to reflow so removing then re-adding the class restarts the animation
     even if the previous cycle just finished. */
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const run = () => {
      const el = titleRef.current
      if (!el) return
      el.classList.remove('nebula-wave-active')
      void el.offsetHeight
      el.classList.add('nebula-wave-active')
    }
    const initial = setTimeout(run, 1100) // wait for the h1 entry animation to finish
    const interval = setInterval(run, 90_000)
    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [])

  /* ── Fetch resources on mount ─────────────────────────────────────────────
     useEffect with an empty [] dependency array runs exactly once, when the
     component first appears on screen. This is the standard pattern for
     loading data from an API when a page opens.
     .then → called with the data if the request succeeds
     .catch → called with an error if it fails
     .finally → called either way; we always want to hide the loading spinner */
  useEffect(() => {
    fetchResources()
      .then(setResources)
      .catch(() => setError('Could not load resources. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  /* ── Client-side filtering ────────────────────────────────────────────────
     useMemo recalculates `filtered` only when `resources`, `search`, or `category`
     change — not on every render. This is a performance optimization.
     We filter down to resources that match BOTH the category and the search text.
     The ?? operator returns the right side if the left is null/undefined. */
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
    <div className="min-h-screen relative z-10">

      {/* ── Hero section ──────────────────────────────────────────────────────
          pt-32 → padding-top pushes content below the fixed navbar
          text-center → everything inside is centered horizontally */}
      <div className="relative pt-32 pb-14 px-6 text-center">

        {/* NEBULA title — each letter is its own <span> so CSS :hover can
            target individual letters. The .nebula-letter class in index.css
            handles the per-letter golden glow on hover.
            Framer Motion's motion.h1 animates the title in from below on load. */}
        <motion.h1
          ref={titleRef}
          className="relative text-7xl md:text-9xl font-bold text-white/90 tracking-[0.25em] uppercase mb-2 glow-nebula cursor-default select-none"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
        >
          {'Nebula'.split('').map((char, i) => (
            <span key={i} className="nebula-letter">{char}</span>
          ))}
        </motion.h1>

        {/* Galaxy visual + subtitle text ─────────────────────────────────────
            GalaxyPortal renders an animated canvas with a spinning galaxy.
            The subtitle text is absolutely positioned on top of the canvas
            with a subtle frosted-glass backdrop to keep it readable. */}
        <motion.div
          className="relative flex justify-center items-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9 }}
        >
          <div className="relative">
            <GalaxyPortal />
            {/* Text overlay — bg-[#010103]/55 is a dark semi-transparent background
                that sits behind the text so it's readable over the galaxy stars.
                backdrop-blur adds a frosted glass effect. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-[#010103]/55 backdrop-blur-[4px] rounded-xl px-6 py-2.5">
                <p className="text-white/90 font-semibold tracking-[0.22em] uppercase text-sm md:text-base glow-white text-center">
                  Discover AI Resources
                </p>
                <p className="text-white/45 text-xs tracking-widest text-center mt-0.5">
                  community-curated tools, articles &amp; courses
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search bar — controlled input component; `value` and `onChange` wire it
            to the `search` state variable above so filtering happens as you type */}
        <div className="relative flex justify-center">
          <SearchBar value={search} onChange={setSearch} />
        </div>
      </div>

      {/* ── Category filter ───────────────────────────────────────────────────
          Pill buttons for "All", "Tool", "Article", etc.
          Passing `selected` and `onChange` lets this component read and update
          the `category` state variable that lives up here in FeedPage. */}
      <div className="px-6 pb-10">
        <CategoryFilter selected={category} onChange={setCategory} />
      </div>

      {/* ── Resource grid ─────────────────────────────────────────────────────
          max-w-6xl mx-auto → caps the width and centers the grid on wide screens */}
      <div className="px-6 pb-20 max-w-6xl mx-auto">

        {/* Error state — shown if the API fetch failed */}
        {error && (
          <div className="text-center py-20 text-red-400/60 text-sm">{error}</div>
        )}

        {/* Loading state — shows 6 skeleton (placeholder) cards while fetching */}
        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state — shown once loading is done but no results match the filters */}
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

        {/* Results grid — AnimatePresence lets cards animate out when removed.
            staggerChildren: 0.06 means each card animates in 60ms after the previous one,
            creating a cascading "waterfall" entrance effect. */}
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

      {/* ── Footer ────────────────────────────────────────────────────────────
          Simple copyright line at the bottom of the page. */}
      <footer className="text-center pb-10 pt-2 text-white/20 text-xs tracking-[0.35em] uppercase">
        © cailinsidea
      </footer>
    </div>
  )
}
