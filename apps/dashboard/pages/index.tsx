export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            KABBATEC CONSTRUÇÕES
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Construindo o Futuro com Inovação e Precisão
          </p>
          <div className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-block transition-colors">
            Fale com um Especialista
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400">+30</div>
            <div className="text-gray-300">Anos de Experiência</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400">500+</div>
            <div className="text-gray-300">Projetos Concluídos</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400">100%</div>
            <div className="text-gray-300">Satisfação dos Clientes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
