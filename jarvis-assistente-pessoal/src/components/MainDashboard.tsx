import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Cpu,
  Layers,
  FileText,
  Sliders,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface MainDashboardProps {
  onOpenAssistant: (prompt?: string) => void;
  isPopupOpen: boolean;
}

export function MainDashboard({ onOpenAssistant, isPopupOpen }: MainDashboardProps) {
  const [serverStatus, setServerStatus] = useState<{
    configured: boolean;
    model: string;
    protocol: string;
  } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setServerStatus(data);
        setChecking(false);
      })
      .catch(() => {
        setChecking(false);
      });
  }, []);

  const featureCards = [
    {
      title: 'Planejamento Estratégico',
      desc: 'Organize metas, priorize pendências críticas e defina etapas operacionais claras.',
      prompt: 'JARVIS, estruture meu planejamento para hoje com foco nas 3 tarefas de maior impacto e prazos recomendados.',
      icon: Layers,
    },
    {
      title: 'Decomposição de Projetos',
      desc: 'Divida demandas complexas em checklists objetivos e critérios de validação.',
      prompt: 'Preciso decompor o seguinte projeto em fases cronológicas com responsáveis e critérios de conclusão: ',
      icon: Sliders,
    },
    {
      title: 'Síntese & Decisões',
      desc: 'Resuma atas, notas ou e-mails longos, extraindo decisões firmes e próximos passos.',
      prompt: 'Por favor, sintetize as seguintes anotações destacando apenas as decisões acordadas e as pendências em aberto: ',
      icon: FileText,
    },
    {
      title: 'Análise de Riscos & Gargalos',
      desc: 'Identifique premissas frágeis, conflitos de prioridade e pontos únicos de falha.',
      prompt: 'JARVIS, analise a seguinte proposta e aponte os maiores riscos operacionais e contingências necessárias: ',
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold shadow-md shadow-cyan-950/40">
              J
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-wider text-zinc-100">
                  JARVIS
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                  Console do Sr. Stark
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Assistente Pessoal de Produtividade & Planejamento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300">
                {checking ? 'Conectando...' : serverStatus?.model || 'gemini-3.8-flash'}
              </span>
            </div>

            {/* Launch Popup Button */}
            <button
              onClick={() => onOpenAssistant()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-medium text-xs sm:text-sm shadow-md shadow-cyan-950/40 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <MessageSquare className="w-4 h-4" />
              {isPopupOpen ? 'Ver Janela Pop-up' : 'Abrir Assistente JARVIS'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="mb-10 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-xs font-medium mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>Simulação Conversacional • Foco em Execução</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 max-w-2xl leading-tight">
            Pronto para os seus comandos,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-200">
              Sr. Stark.
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Assistente pessoal com tom preciso, analítico e sutilmente espirituoso. Focado em
            organizar etapas, priorizar tarefas e lapidar decisões do dia a dia com rapidez e sem
            distrações visuais.
          </p>
        </div>

        {/* Quick Activation Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {featureCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => onOpenAssistant(card.prompt)}
                className="group p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-cyan-500/50 hover:bg-zinc-850/80 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-cyan-400 group-hover:text-cyan-300 group-hover:border-cyan-500/40 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500 group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                      Iniciar no pop-up →
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Operational Guidelines & Privacy Accordion / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-850 pt-8 text-xs text-zinc-400">
          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Personalidade Fiel</span>
            </div>
            <p className="leading-relaxed">
              Respostas diretas, tratamento natural como "Sr. Stark", ironia elegante quando
              adequado e total clareza entre orientar e executar.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold mb-1">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Chaves & Segurança</span>
            </div>
            <p className="leading-relaxed">
              Chamadas processadas via proxy seguro Express no backend. Nenhuma credencial de API é
              exposta ao cliente.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold mb-1">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Móvel & Acompanhante</span>
            </div>
            <p className="leading-relaxed">
              Arraste a janela ou o núcleo minimizado para qualquer lugar. Clique no ícone de saída no cabeçalho para abrir em <strong>janela desacoplada / PiP</strong> e acompanhar o trabalho enquanto navega em outras abas.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-850 py-4 px-6 text-center text-xs text-zinc-400">
        <p>
          JARVIS • Simulação de assistente pessoal conversacional para o Sr. Stark. Foco estrito em produtividade, planejamento e síntese de informações.
        </p>
      </footer>
    </div>
  );
}
