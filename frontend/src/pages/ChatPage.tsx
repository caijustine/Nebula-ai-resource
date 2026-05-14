/* ─── ChatPage.tsx — Full-screen AI chat page ─────────────────────────────────
   Accessible at /chat. Same chat logic as ChatPanel (via useChat hook)
   but laid out to fill the entire viewport for a focused experience.
   A "← Feed" button in the top-left navigates back to the main page. */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'

export function ChatPage() {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    sendMessage,
    handleKeyDown,
    messagesEndRef,
  } = useChat()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col pt-16">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-white/30 hover:text-white/70 text-sm transition-colors"
        >
          ← Feed
        </button>
        <div className="flex items-center gap-2">
          <motion.span
            className="text-blue-400 text-sm"
            style={{ filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.9))' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            ✦
          </motion.span>
          <span className="text-white/80 font-medium tracking-wide">
            Nebula Assistant
          </span>
        </div>
      </div>

      {/* ── Message list ────────────────────────────────────────────────── */}
      {/* max-w-3xl + mx-auto keeps long messages readable on wide screens */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full space-y-4">
        {messages.length === 0 && (
          <p className="text-white/25 text-sm text-center mt-16 leading-relaxed">
            Ask me anything about AI.<br />
            <span className="text-white/15">I'll try to care.</span>
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-fuchsia-950/50 border border-fuchsia-500/20 text-fuchsia-100/90'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/75'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-[2px] h-[1em] bg-white/50 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-red-400/70 text-xs text-center">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-white/[0.06] max-w-3xl mx-auto w-full">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the cosmos..."
            disabled={isStreaming}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-fuchsia-500/30 transition-colors disabled:opacity-50"
          />
          <motion.button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="px-4 py-3 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/28 text-fuchsia-200/85 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              boxShadow:
                '0 0 10px rgba(232,121,249,0.30), 0 0 26px rgba(192,132,252,0.16)',
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            →
          </motion.button>
        </div>
      </div>
    </div>
  )
}
