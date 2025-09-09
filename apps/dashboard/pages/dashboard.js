import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    // Simular verificação de autenticação
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Simular dados do usuário (normalmente viriam da API)
    setUser({
      nome: 'Laura Silva',
      cargo: 'Compradora',
      email: 'laura@kabbatec.com'
    });

    // Simular dados de pedidos
    setPedidos([
      { id: 1, obra: 'Edifício Central', status: 'Pendente', valor: 'R$ 15.000,00' },
      { id: 2, obra: 'Condomínio Vista Verde', status: 'Aprovado', valor: 'R$ 8.500,00' },
      { id: 3, obra: 'Shopping Boulevard', status: 'Em Análise', valor: 'R$ 22.300,00' }
    ]);

    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">KABBATEC CONSTRUÇÕES</h1>
            <p className="text-gray-400">Sistema de Gestão</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-medium">{user?.nome}</div>
              <div className="text-sm text-gray-400">{user?.cargo}</div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Bem-vindo ao Sistema!</h2>
            <p className="text-gray-400">
              Gerencie seus pedidos, obras e fornecedores de forma eficiente.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">12</div>
              <div className="text-gray-400">Pedidos Ativos</div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-2xl font-bold text-green-400">8</div>
              <div className="text-gray-400">Obras em Andamento</div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">5</div>
              <div className="text-gray-400">Aguardando Aprovação</div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">R$ 156.000</div>
              <div className="text-gray-400">Valor Total</div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Pedidos Recentes</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">ID</th>
                    <th className="text-left py-3 px-4">Obra</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((pedido) => (
                    <tr key={pedido.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="py-3 px-4">#{pedido.id}</td>
                      <td className="py-3 px-4">{pedido.obra}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          pedido.status === 'Aprovado'
                            ? 'bg-green-900 text-green-300'
                            : pedido.status === 'Pendente'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-blue-900 text-blue-300'
                        }`}>
                          {pedido.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{pedido.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* API Status */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Status do Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>API Backend</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Banco de Dados</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Sistema de Filas</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
