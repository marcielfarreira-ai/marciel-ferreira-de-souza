import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Users, CreditCard, ReceiptText, BarChart3, LogOut, Car } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/drivers', label: 'Motoristas', icon: Users },
    { to: '/admin/plans', label: 'Planos', icon: CreditCard },
  ]
  const driverLinks = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/transactions', label: 'Transações', icon: ReceiptText },
    { to: '/app/reports', label: 'Relatórios', icon: BarChart3 },
  ]
  const links = isAdmin ? adminLinks : driverLinks

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
        <div className="px-6 py-5 flex items-center gap-2 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">DriverFina</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(link => {
            const Icon = link.icon
            return (
              <NavLink key={link.to} to={link.to} end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition w-full">
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
