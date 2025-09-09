"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="fixed inset-x-0 top-0 z-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div
          className={`mt-4 ${scrolled ? 'h-12' : 'h-14'} rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,.25)] flex items-center px-4 transition-[height] duration-300`}
        >
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-primary/30 border border-primary/40" />
            <span className="font-semibold tracking-tight">Kabbatec</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70 ml-8">
            <a href="#servicos" className="hover:text-white transition">Serviços</a>
            <a href="#como-funciona" className="hover:text-white transition">Como Funciona</a>
            <a href="#depoimentos" className="hover:text-white transition">Depoimentos</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <a className="ml-auto kb-cta-primary" href="#contato">
            Fale Conosco
          </a>
        </div>
      </div>
    </nav>
  );
}
