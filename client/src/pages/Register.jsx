import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { Car } from 'lucide-react'
import GoogleSignIn from '../components/GoogleSignIn'

export default function Register() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleGoogle = async (credential) => {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/google', { credential })
      login(res.data.token, res.data.user)
      if (!res.data.user.onboardingCompleted) {
        navigate('/onboarding')
      } else {
        navigate('/app')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao cadastrar com Google')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 mb-4">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">DriverFina</h1>
          <p className="text-slate-400 mt-2">Crie sua conta com o Google e comece o teste grátis de 7 dias</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 space-y-5 border border-slate-800">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
          <p className="text-sm text-slate-400 text-center">
            Use sua conta Google para se cadastrar. Isso garante um email válido e evita cadastros falsos.
          </p>
          <GoogleSignIn onSuccess={handleGoogle} onError={setError} text="continue_with" />
          <p className="text-center text-sm text-slate-400">
            Já tem conta? <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
