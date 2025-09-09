import React from "react";

export default function Services() {
  const services = [
    {
      title: "Execução\nExcepcional",
      desc:
        "Precisão inigualável do planejamento à entrega final, garantindo resultados que superam expectativas.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/90">
          <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      delay: 0,
    },
    {
      title: "Gestão\nEficiente",
      desc:
        "Controle rigoroso de projetos com eficiência comprovada, assegurando cumprimento de prazos e otimização de recursos.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/90">
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <path d="M8 6h8M6 8v8M8 18h10" />
        </svg>
      ),
      delay: 0.1,
    },
    {
      title: "Design\nInovador",
      desc:
        "Criamos espaços que combinam funcionalidade com estética moderna, elevando o padrão de design arquitetônico.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/90">
          <path d="M12 2v7l2 2" />
          <path d="M7 22l5-11 5 11" />
          <path d="M8.5 19h7" />
        </svg>
      ),
      delay: 0.2,
    },
    {
      title: "Tecnologia\nAvançada",
      desc:
        "Empregamos as tecnologias mais recentes para melhorar a eficiência da construção e oferecer soluções sustentáveis.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/90">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
          <path d="M8 2v2M16 2v2M8 20v2M16 20v2M2 8h2M2 16h2M20 8h2M20 16h2" />
        </svg>
      ),
      delay: 0.3,
    },
  ];

  return (
    <section id="servicos" className="relative py-24 px-4 sm:px-6 lg:px-8 kb-services">
      {/* Background da seção */}
      <div className="kb-services-bg absolute inset-0" aria-hidden />
      <div className="kb-services-topfade absolute inset-x-0 top-0 h-16 md:h-24 pointer-events-none" />
      <div className="kb-services-bottomfade absolute inset-x-0 bottom-0 h-16 md:h-24 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div className="kb-services-head text-center fade-in-up">
          <h2 className="kb-display text-4xl sm:text-5xl font-extrabold text-white mb-5">
            Nossos Serviços
          </h2>
          <p className="text-lg sm:text-xl kb-subhead max-w-3xl mx-auto leading-relaxed">
            Execução excepcional desde o planejamento até a entrega final, garantindo resultados que superam expectativas.
          </p>
        </div>

        {/* Linha neon de conexão (desktop) */}
        <div className="hidden md:block kb-services-line" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {services.map((s, i) => (
            <div
              key={i}
              className="kb-service-card fade-in-up"
              style={{ animationDelay: `${s.delay}s` }}
            >
              <div className="kb-service-icon mb-5">
                {s.icon}
              </div>
              <h3 className="text-[22px] font-semibold leading-tight whitespace-pre-line mb-3 text-white">
                {s.title}
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


