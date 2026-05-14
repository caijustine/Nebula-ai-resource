// ─── useChat.ts — Custom React hook for chat state ────────────────────────────
// A "custom hook" is a function that bundles related useState + useEffect logic
// so two components (ChatPanel and ChatPage) can share the same behavior without
// duplicating code. React hooks must start with "use" — that's the convention.
//
// This hook manages:
//   messages     → the full conversation history (array of {role, content} objects)
//   input        → the current text the user is typing
//   isStreaming  → true while Claude is mid-response (prevents double-sends)
//   error        → any error message to show the user
//   messagesEndRef → a ref attached to a hidden div at the bottom of the message
//                    list, used to auto-scroll as new text arrives

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types/chat'
import { streamChat } from '../api/chat'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // useRef creates a stable reference to a DOM element across re-renders.
  // We attach this to a hidden <div> at the bottom of the message list.
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom whenever messages change (new text arrives).
  // scrollIntoView() moves the page so the referenced element is visible.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    // history = all previous messages + the new user message (used to send to API)
    const history = [...messages, userMsg]
    // Immediately add the user message AND an empty assistant message to the UI.
    // The empty assistant message will be filled in chunk-by-chunk as Claude responds.
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setIsStreaming(true)
    setError(null)

    await streamChat(
      history,
      // onChunk: append each new piece of text to the last message (the assistant's)
      (chunk) => {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      },
      // onDone: streaming finished, hide the blinking cursor
      () => setIsStreaming(false),
      // onError: show the error message below the chat
      (err) => {
        setError(err.message)
        setIsStreaming(false)
      },
    )
  }

  // Allow pressing Enter to send (Shift+Enter inserts a newline instead)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    sendMessage,
    handleKeyDown,
    messagesEndRef,
  }
}
