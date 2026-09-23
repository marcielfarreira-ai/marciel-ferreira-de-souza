import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Layout from './components/Layout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminDrivers from './pages/admin/Drivers'
import AdminPlans from './pages/admin/Plans'
import DriverDashboard from './pages/driver/Dashboard'
import DriverClosings from './pages/driver/Closings'
import DriverTransactions from './pages/driver/Transactions'
import DriverReports from './pages/driver/Reports'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Carregando...</div>
  if (!user) return <Navigate to="/login" />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} />
  // Driver must complete onboarding before accessing app
  if (role === 'driver' && !user.onboardingCompleted) return <Navigate to="/onboarding" />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="plans" element={<AdminPlans />} />
      </Route>
      <Route path="/app" element={<ProtectedRoute role="driver"><Layout /></ProtectedRoute>}>
        <Route index element={<DriverDashboard />} />
        <Route path="closings" element={<DriverClosings />} />
        <Route path="transactions" element={<DriverTransactions />} />
        <Route path="reports" element={<DriverReports />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}
