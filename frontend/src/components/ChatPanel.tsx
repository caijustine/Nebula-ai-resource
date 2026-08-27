/* ─── ChatPanel.tsx — Slide-in AI chat panel ──────────────────────────────────
   This panel slides in from the right side of the screen when the user clicks
   "Ask Nebula" in the navbar dropdown. It contains the full chat interface.

   Key layout decisions:
   - position: fixed → stays on top of the page content, doesn't affect layout
   - z-index: 40 → renders above the page but below z-50 (the navbar)
   - The Expand button closes the panel AND navigates to /chat (full-screen mode)
   - Messages: user messages on the right (fuchsia), assistant on the left (white) */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'

interface ChatPanelProps {
  onClose: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
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
    /* motion.div with x: '100%' → x: 0 slides the panel in from the right.
       type: 'spring' gives it a natural elastic feel rather than a linear slide. */
    <motion.div
      className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-[380px] max-w-[100vw] z-40 flex flex-col bg-[#06060f]/97 backdrop-blur-2xl border-r border-white/[0.07] shadow-[8px_0_40px_rgba(0,0,0,0.6)]"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <motion.span
            className="text-blue-400 text-sm"
            style={{ filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.9))' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            ✦
          </motion.span>
          <span className="text-white/80 text-sm font-medium tracking-wide">
            Nebula Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Expand button: closes the panel and navigates to the full /chat page */}
          <button
            onClick={() => { onClose(); navigate('/chat') }}
            className="text-white/30 hover:text-white/70 text-xs transition-colors px-2 py-1 rounded hover:bg-white/[0.05]"
            title="Open full page"
          >
            ⤢ Expand
          </button>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded hover:bg-white/[0.05] text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Message list ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-white/25 text-xs text-center mt-8 leading-relaxed">
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
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-fuchsia-950/50 border border-fuchsia-500/20 text-fuchsia-100/90'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/75'
              }`}
            >
              {msg.content}
              {/* Blinking cursor: only shown on the last assistant message while streaming */}
              {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-[2px] h-[1em] bg-white/50 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-red-400/70 text-xs text-center px-2">{error}</p>
        )}

        {/* Invisible div at the bottom — scrollIntoView() targets this to auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the cosmos..."
            disabled={isStreaming}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-fuchsia-500/30 transition-colors disabled:opacity-50"
          />
          <motion.button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="px-3 py-2 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/28 text-fuchsia-200/85 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
    </motion.div>
  )
}
