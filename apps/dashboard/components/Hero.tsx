export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* [1] Base gradient */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F14] via-[#0E141B] to-[#0B0F14]" />

        {/* [2] Radial glow (accent) */}
        <div className="pointer-events-none absolute -top-1/3 inset-x-0 h-[60vh]
                        bg-[radial-gradient(50%_40%_at_50%_0%,rgba(124,77,255,0.35)_0%,rgba(124,77,255,0)_65%)]
                        blur-3xl" />

        {/* [4] Vignette + noise */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/25 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGD4DwABxQGkHf3rOQAAAABJRU5ErkJggg==")',
          }}
        />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto max-w-[1040px] px-6 pt-28 pb-14 md:pt-32">
        {/* Glass card */}
        <div className="kb-hero-card p-6 md:p-10 text-center">
          {/* inner highlight */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          {/* assimetric corner glow */}
          <div className="kb-hero-corner-glow" />
          {/* top outer glow line */}
          <div className="kb-hero-topglow" />

          <p className="mb-3 text-xs tracking-[0.18em] text-white/60">KABBATEC CONSTRUÇÕES</p>

          {/* H1 BRANCO (sem gradiente) */}
          <h1 className="kb-display text-white text-4xl md:text-6xl font-extrabold tracking-[-0.015em] leading-[1.08] mx-auto max-w-[920px] mb-6 md:mb-8">
            Construindo o Futuro com Inovação e Precisão
          </h1>

          <p className="kb-subhead text-base md:text-lg max-w-3xl mx-auto mb-8 md:mb-10">
            Transforme seu espaço com líderes em arquitetura moderna. Mais de 30 anos de experiência
            consolidada em projetos que superam expectativas.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 md:gap-5 justify-center">
            <a
              href="#contato"
              className="inline-flex items-center justify-center kb-cta-primary-light"
            >
              Fale com um Especialista
            </a>

            <a
              href="#projetos"
              className="inline-flex items-center justify-center kb-cta-ghost"
            >
              Conheça Nossos Projetos
            </a>
          </div>
        </div>

        {/* Métricas */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            { n: '+30', l: 'Anos de Experiência', v: 'kb-stat-blue' },
            { n: '500+', l: 'Projetos Concluídos', v: 'kb-stat-indigo' },
            { n: '100%', l: 'Satisfação dos Clientes', v: 'kb-stat-violet' },
          ].map((s, i) => (
            <div
              key={i}
              className={`kb-stat ${s.v} px-6 py-8 md:px-8 md:py-10 text-center`}
            >
              <div className="text-4xl md:text-5xl font-semibold text-white">{s.n}</div>
              <div className="mt-2 text-sm text-white/70">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Logos removidas conforme solicitado */}
      </div>
    </section>
  );
}


