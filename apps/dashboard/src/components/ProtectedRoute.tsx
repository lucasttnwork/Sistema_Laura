import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';

const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Se o usuÃ¡rio nÃ£o estiver autenticado, redireciona para a pÃ¡gina de login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, renderiza o componente filho (a pÃ¡gina protegida)
  return <Outlet />;
};

export default ProtectedRoute;

