import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Uploads from './pages/Uploads'
import Studio from './pages/Studio'
import Tasks from './pages/Tasks'
import Comments from './pages/Comments'
import Account from './pages/Account'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { api } from './lib/api'
import { supabase } from './lib/supabase'

const PipelineContext = createContext({})
export const usePipeline = () => useContext(PipelineContext)

// Auth Guard Component
function RequireAuth({ children, session }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const [running, setRunning] = useState(false)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return;
    try {
      const channel = supabase
        .channel('runs-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'runs', filter: `user_id=eq.${session.user.id}` }, payload => {
          if (payload.new?.status === 'running') setRunning(true)
          if (['success', 'failed'].includes(payload.new?.status)) setRunning(false)
        })
        .subscribe()
      return () => supabase.removeChannel(channel)
    } catch {}
  }, [session])

  const runPipeline = async () => {
    setRunning(true)
    try {
      await api.pipeline.run()
    } catch {
      setRunning(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <PipelineContext.Provider value={{ running, runPipeline, session }}>

        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/*" element={
            <RequireAuth session={session}>
              <div className="flex h-screen bg-[#0e0e0e] text-[#e5e2e1] overflow-hidden selection:bg-yt-red/30">
                <Sidebar />
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
                  <div className="max-w-7xl mx-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/uploads" element={<Uploads />} />
                      <Route path="/studio" element={<Studio />} />
                      <Route path="/tasks" element={<Tasks />} />
                      <Route path="/comments" element={<Comments />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </RequireAuth>
          } />
        </Routes>
    </PipelineContext.Provider>
  )
}
