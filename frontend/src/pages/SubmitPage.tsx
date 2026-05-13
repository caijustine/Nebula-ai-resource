import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { createResource } from '../api/resources'
import { CATEGORIES } from '../types/resource'

interface FormState {
  title: string
  url: string
  description: string
  category: string
  tags: string
  submitter_name: string
}

interface Errors {
  title?: string
  url?: string
}

const URL_RE = /^https?:\/\/.+/

const INITIAL: FormState = {
  title: '', url: '', description: '', category: '', tags: '', submitter_name: '',
}

export function SubmitPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const validateField = (field: keyof Errors, value: string): string | undefined => {
    if (field === 'title') return !value.trim() ? 'Title is required' : undefined
    if (field === 'url') return !URL_RE.test(value) ? 'Must start with http:// or https://' : undefined
  }

  const handleBlur = (field: keyof Errors) => {
    const msg = validateField(field, form[field])
    setErrors((p) => ({ ...p, [field]: msg }))
  }

  const validate = (): boolean => {
    const next: Errors = {
      title: validateField('title', form.title),
      url: validateField('url', form.url),
    }
    setErrors(next)
    return !next.title && !next.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await createResource({
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim() || undefined,
        category: form.category || undefined,
        tags: form.tags.trim() || undefined,
        submitter_name: form.submitter_name.trim() || undefined,
      })
      toast.success('Resource added to the cosmos ✦')
      navigate('/')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (error?: string) =>
    `bg-white/[0.05] border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-all w-full ${
      error
        ? 'border-red-500/50 focus:border-red-400/70 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
        : 'border-white/10 focus:border-blue-500/50 focus:shadow-[0_0_12px_rgba(59,130,246,0.15)]'
    }`

  return (
    <div className="min-h-screen bg-[#05050f] relative z-10 flex items-center justify-center px-6 py-28">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Share a Resource</h1>
          <p className="text-white/35 text-sm">Add something valuable to the cosmos</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl rounded-2xl p-7 flex flex-col gap-5"
        >
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Title <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              onBlur={() => handleBlur('title')}
              placeholder="e.g. Andrej Karpathy's Neural Networks Zero to Hero"
              className={fieldClass(errors.title)}
            />
            {errors.title && (
              <motion.p
                className="text-red-400 text-xs"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {errors.title}
              </motion.p>
            )}
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              URL <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              value={form.url}
              onChange={set('url')}
              onBlur={() => handleBlur('url')}
              placeholder="https://..."
              className={fieldClass(errors.url)}
            />
            {errors.url && (
              <motion.p
                className="text-red-400 text-xs"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {errors.url}
              </motion.p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="What makes this resource valuable?"
              className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Category
            </label>
            <select
              value={form.category}
              onChange={set('category')}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Tags
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={set('tags')}
              placeholder="llm, free, beginner (comma-separated)"
              className={fieldClass()}
            />
          </div>

          {/* Submitter name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Your Name
            </label>
            <input
              type="text"
              value={form.submitter_name}
              onChange={set('submitter_name')}
              placeholder="Optional"
              className={fieldClass()}
            />
          </div>

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full py-3 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-medium text-sm hover:bg-blue-500/25 hover:border-blue-400/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: submitting ? 1 : 1.02 }}
            whileTap={{ scale: submitting ? 1 : 0.98 }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              'Add to the Cosmos ✦'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
