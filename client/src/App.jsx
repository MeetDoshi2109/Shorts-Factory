import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { createContext, useContext, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Uploads from './pages/Uploads'
import Studio from './pages/Studio'
import Tasks from './pages/Tasks'
import Comments from './pages/Comments'
import Account from './pages/Account'
import Settings from './pages/Settings'
import { api } from './lib/api'
import { supabase } from './lib/supabase'

// ─── Global Pipeline Context ──────────────────────────────────────────────
export const PipelineContext = createContext(null)
export const usePipeline = () => useContext(PipelineContext)

function App() {
  const location = useLocation()
  const [pipelineState, setPipelineState] = useState({
    running: false, runId: null, lastRun: null, recentLogs: [],
  })
  const [serverOnline, setServerOnline] = useState(null)

  // ── Poll server health every 8s ──────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        await api.health()
        setServerOnline(true)
      } catch {
        setServerOnline(false)
      }
    }
    check()
    const id = setInterval(check, 8000)
    return () => clearInterval(id)
  }, [])

  // ── Poll pipeline status every 3s ────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await api.pipeline.status()
        setPipelineState(data)
      } catch {}
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [])

  // ── Supabase Realtime — live run updates ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('runs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs' }, (payload) => {
        if (payload.new?.status === 'running') {
          setPipelineState(s => ({ ...s, running: true, runId: payload.new.run_id }))
        } else if (payload.new?.status === 'success' || payload.new?.status === 'failed') {
          setPipelineState(s => ({ ...s, running: false, lastRun: payload.new }))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const runPipeline = async (opts = {}) => {
    try {
      const result = await api.pipeline.run(opts)
      setPipelineState(s => ({ ...s, running: true }))
      return result
    } catch (err) {
      throw err
    }
  }

  return (
    <PipelineContext.Provider value={{ ...pipelineState, runPipeline, serverOnline }}>
      <div className="flex min-h-screen bg-surface-dim">
        <Sidebar />
        <main className="flex-1 ml-[260px] min-h-screen overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/uploads"   element={<Uploads />} />
              <Route path="/studio"    element={<Studio />} />
              <Route path="/tasks"     element={<Tasks />} />
              <Route path="/comments"  element={<Comments />} />
              <Route path="/account"   element={<Account />} />
              <Route path="/settings"  element={<Settings />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </PipelineContext.Provider>
  )
}

export default App
