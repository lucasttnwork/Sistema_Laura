import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'

import { Heading } from './components/ui/heading'
import { cn } from './lib/cn'
import ContatosPage from './pages/ContatosPage'
import CotacoesPage from './pages/CotacoesPage'
import FiscaisPage from './pages/FiscaisPage'
import FornecedoresPage from './pages/FornecedoresPage'
import LoginPage from './pages/LoginPage'
import ObrasPage from './pages/ObrasPage'
import SolicitacoesPage from './pages/SolicitacoesPage'

type NavItem = {
  to: string
  label: string
  testId: string
}

const navItems: NavItem[] = [
  { to: '/solicitacoes', label: 'Solicitacoes', testId: 'nav-solicitacoes' },
  { to: '/cotacoes', label: 'Cotacoes', testId: 'nav-cotacoes' },
  { to: '/obras', label: 'Obras', testId: 'nav-obras' },
  { to: '/fornecedores', label: 'Fornecedores', testId: 'nav-fornecedores' },
  { to: '/fiscais', label: 'Fiscais', testId: 'nav-fiscais' },
  { to: '/contatos', label: 'Contatos', testId: 'nav-contatos' },
]

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <aside className="flex w-full flex-col gap-6 border-b border-outline bg-surface/90 px-6 py-5 backdrop-blur md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="space-y-1">
          <Heading level={1} size="lg" dataTestId="brand-heading" className="text-primary">
            Sistema Laura
          </Heading>
          <p className="text-sm text-muted-foreground">Dashboard Operacional</p>
        </div>
        <nav className="flex flex-wrap gap-2 md:flex-col md:gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testId}
              className={({ isActive }) =>
                cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary shadow-soft'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-outline bg-surface/60 px-6 py-4 backdrop-blur">
          <Heading level={2} size="md" dataTestId="dashboard-heading" className="text-foreground">
            Dashboard
          </Heading>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/solicitacoes" />} />
          <Route path="/solicitacoes" element={<SolicitacoesPage />} />
          <Route path="/cotacoes" element={<CotacoesPage />} />
          <Route path="/obras" element={<ObrasPage />} />
          <Route path="/fornecedores" element={<FornecedoresPage />} />
          <Route path="/fiscais" element={<FiscaisPage />} />
          <Route path="/contatos" element={<ContatosPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
