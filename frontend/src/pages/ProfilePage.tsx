import { useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import { Button, Card } from '../components/ui'

export function ProfilePage() {
  const { email, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Профиль</h1>
      <Card className="space-y-4 p-6">
        <div className="space-y-1">
          <div className="text-sm text-slate-500 dark:text-zinc-400">Email</div>
          <div className="font-medium">{email}</div>
        </div>
        <Button variant="secondary" onClick={toggle} className="w-full">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="w-full"
        >
          <LogOut size={18} /> Выйти
        </Button>
      </Card>
    </div>
  )
}
