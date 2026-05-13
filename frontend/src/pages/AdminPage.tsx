import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { deleteResource, fetchResources, verifyAdmin } from '../api/resources'
import { ResourceCard } from '../components/ResourceCard'
import { SkeletonCard } from '../components/SkeletonCard'
import type { Resource } from '../types/resource'

export function AdminPage() {
  const [password, setPassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setAuthError(false)
    const ok = await verifyAdmin(password)
    setVerifying(false)
    if (ok) {
      setAdminPassword(password)
      setAuthed(true)
      setLoading(true)
      fetchResources()
        .then(setResources)
        .finally(() => setLoading(false))
    } else {
      setAuthError(true)
      setPassword('')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteResource(id, adminPassword)
      setResources((prev) => prev.filter((r) => r.id !== id))
      toast.success('Resource removed')
    } catch {
      toast.error('Failed to delete resource')
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#05050f] relative z-10 flex items-center justify-center px-6">
        <motion.form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl rounded-2xl p-8 flex flex-col gap-5"
          animate={authError ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center">
            <p className="text-white/20 text-3xl mb-3">⬡</p>
            <h1 className="text-white font-semibold text-lg">Admin Access</h1>
            <p className="text-white/30 text-xs mt-1">Enter your admin password to continue</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className={`bg-white/[0.05] border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-all ${
              authError
                ? 'border-red-500/50 focus:border-red-400/70'
                : 'border-white/10 focus:border-blue-500/50'
            }`}
          />

          {authError && (
            <motion.p
              className="text-red-400 text-xs text-center -mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Incorrect password
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={verifying || !password}
            className="py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white/60 text-sm hover:bg-white/[0.09] hover:text-white/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {verifying ? 'Verifying...' : 'Enter'}
          </motion.button>
        </motion.form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05050f] relative z-10 px-6 pt-28 pb-32">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Manage Resources</h1>
          <span className="text-xs text-white/25">{resources.length} total</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <p className="text-white/30 text-center py-20">No resources yet.</p>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            <AnimatePresence>
              {resources.map((r) => (
                <ResourceCard key={r.id} resource={r} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
