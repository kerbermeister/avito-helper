import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { ListingsPage } from './pages/ListingsPage'
import { ListingFormPage } from './pages/ListingFormPage'
import { ListingDetailPage } from './pages/ListingDetailPage'
import { ProfilePage } from './pages/ProfilePage'

function Protected() {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route path="/" element={<ListingsPage />} />
        <Route path="/new" element={<ListingFormPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
        <Route path="/listings/:id/edit" element={<ListingFormPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
