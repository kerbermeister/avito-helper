import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { cn, STATUS_ORDER, STATUS_META } from '../lib/utils'
import type { ListingStatus } from '../types'
import { ListingCard } from '../components/ListingCard'
import { Input, Spinner } from '../components/ui'

type Filter = ListingStatus | 'ALL'

export function ListingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['listings'],
    queryFn: api.listListings,
  })
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((l) => {
      const byStatus = filter === 'ALL' || l.status === filter
      const q = search.trim().toLowerCase()
      const bySearch = !q || l.title.toLowerCase().includes(q)
      return byStatus && bySearch
    })
  }, [data, filter, search])

  const filters: Filter[] = ['ALL', ...STATUS_ORDER]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Мои объявления</h1>
        <Link
          to="/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 md:hidden"
        >
          <Plus size={18} /> Новое
        </Link>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию"
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
            )}
          >
            {f === 'ALL' ? 'Все' : STATUS_META[f as ListingStatus].label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600">
          Не удалось загрузить: {error instanceof Error ? error.message : 'Ошибка'}
        </p>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
          Пока пусто. Создайте первое объявление.
        </div>
      )}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  )
}
