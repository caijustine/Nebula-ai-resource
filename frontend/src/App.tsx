/* ─── App.tsx — Root component ────────────────────────────────────────────────
   This is the top-level component that every page in the app lives inside.
   It sets up:
     1. The router (so clicking links changes the URL without a full page reload)
     2. The persistent background visuals (particles + click ripples)
     3. The navbar (always visible at the top)
     4. The chat panel (slides in when the user clicks "Ask Nebula")
     5. The routes (which page component shows for which URL)

   chatOpen state lives here (not in Navbar) because App.tsx needs to render
   ChatPanel — components can only render siblings or children, not parents. */

import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { ParticleField } from './components/ParticleField'
import { ClickRipple } from './components/ClickRipple'
import { ChatPanel } from './components/ChatPanel'
import { FeedPage } from './pages/FeedPage'
import { SubmitPage } from './pages/SubmitPage'
import { AdminPage } from './pages/AdminPage'
import { ChatPage } from './pages/ChatPage'

export default function App() {
  // chatOpen controls whether the slide-in ChatPanel is visible.
  // It lives here so Navbar can trigger it (via onOpenChat prop) and
  // App can render/remove the panel (via AnimatePresence).
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <BrowserRouter>
      <ParticleField />
      <ClickRipple />

      <Navbar onOpenChat={() => setChatOpen(true)} />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f0f1e',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />

      {/* AnimatePresence lets ChatPanel animate out when chatOpen becomes false.
          Without this, the panel would just disappear instantly on close. */}
      <AnimatePresence>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}
