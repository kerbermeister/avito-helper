import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutList, Plus, User, Moon, Sun, LogOut } from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/', label: 'Объявления', icon: LayoutList, end: true },
  { to: '/new', label: 'Новое', icon: Plus, end: false },
  { to: '/profile', label: 'Профиль', icon: User, end: false },
]

export function Layout() {
  const { email, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 md:flex">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold">Avito Helper</span>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium',
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="text-sm text-slate-500 dark:text-zinc-400">{email}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Выйти"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-zinc-400',
              )
            }
          >
            <item.icon size={22} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
