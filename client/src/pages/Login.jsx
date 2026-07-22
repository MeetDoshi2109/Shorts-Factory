import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { Loader2, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../components/PageTransition'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass p-8 w-full max-w-md rounded-2xl border border-surface-high"
        >
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg bg-yt-red flex items-center justify-center shadow-[0_0_15px_rgba(255,0,0,0.5)]">
              <Play size={16} className="text-white fill-white ml-0.5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Shorts Factory</span>
          </div>

          <h2 className="text-headline-sm font-semibold text-white mb-2 text-center">
            {isSignUp ? 'Create an Account' : 'Sign in to Dashboard'}
          </h2>
          <p className="text-caption text-on-surface/50 text-center mb-6">
            Enter your email below to {isSignUp ? 'create your account' : 'access your control center'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Email</label>
              <input 
                type="email" required
                className="input" 
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Password</label>
              <input 
                type="password" required
                className="input" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <motion.button 
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className="btn btn-primary w-full justify-center mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-caption text-on-surface/50 hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
