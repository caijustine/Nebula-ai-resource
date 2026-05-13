import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { ParticleField } from './components/ParticleField'
import { FeedPage } from './pages/FeedPage'
import { SubmitPage } from './pages/SubmitPage'
import { AdminPage } from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <ParticleField />
      <Navbar />
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
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}
