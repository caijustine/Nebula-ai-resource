import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { deleteResource, fetchResources, verifyAdmin } from '../api/resources'
import { ResourceCard } from '../components/ResourceCard'
import type { Resource } from '../types/resource'

export function AdminPage() {
  const [password, setPassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
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
      setShakeKey((k) => k + 1)
      setPassword('')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this resource? This cannot be undone.')) return
    try {
      await deleteResource(id, adminPassword)
      setResources((prev) => prev.filter((r) => r.id !== id))
      toast.success('Resource removed')
    } catch {
      toast.error('Failed to delete resource')
    }
  }

  const GalaxyLoader = ({ label }: { label: string }) => (
    <div className="min-h-screen bg-[#05050f] relative z-10 flex flex-col items-center justify-center">
      <div className="relative w-44 h-44" style={{ perspective: '500px' }}>
        {[
          { size: 176, color: '139,92,246', rotX: 72, dur: 13, rev: false },
          { size: 118, color: '96,165,250',  rotX: 54, dur: 8.5, rev: true },
          { size: 66,  color: '232,121,249', rotX: 33, dur: 5,   rev: false },
        ].map(({ size, color, rotX, dur, rev }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: size, height: size,
              top: '50%', left: '50%',
              marginTop: -size / 2, marginLeft: -size / 2,
              transform: `rotateX(${rotX}deg)`,
            }}
          >
            <motion.div
              className="w-full h-full rounded-full border-2"
              style={{ borderColor: `rgba(${color}, 0.45)` }}
              animate={{ rotate: rev ? -360 : 360 }}
              transition={{ duration: dur, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-3 h-3 rounded-full bg-white"
            style={{ boxShadow: '0 0 14px white, 0 0 32px rgba(139,92,246,0.9), 0 0 64px rgba(96,165,250,0.5)' }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
      <motion.p
        className="mt-10 text-white/20 text-[11px] tracking-[0.4em] uppercase"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        {label}
      </motion.p>
    </div>
  )

  if (verifying) return <GalaxyLoader label="Verifying" />
  if (authed && loading) return <GalaxyLoader label="Loading" />

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#05050f] relative z-10 flex items-center justify-center px-6">
        <motion.form
          key={shakeKey}
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

        {resources.length === 0 ? (
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
