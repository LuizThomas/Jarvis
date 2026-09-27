import { QuickPrompt } from '../types';

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'etapas',
    title: 'Dividir em etapas',
    category: 'planejamento',
    prompt: 'Por favor, estruture a seguinte meta em etapas cronológicas e objetivas com critérios claros de conclusão: ',
  },
  {
    id: 'prioridades',
    title: 'Priorizar tarefas',
    category: 'produtividade',
    prompt: 'Analise a seguinte lista de pendências, classifique por prioridade de impacto e aponte o primeiro passo imediato: ',
  },
  {
    id: 'checklist',
    title: 'Criar checklist',
    category: 'planejamento',
    prompt: 'Gere um checklist operacional e conciso para a seguinte atividade: ',
  },
  {
    id: 'resumo',
    title: 'Resumir decisões',
    category: 'analise',
    prompt: 'Sintetize o texto a seguir, destacando apenas as decisões tomadas, pendências e responsáveis: ',
  },
  {
    id: 'revisar-tom',
    title: 'Revisar tom e clareza',
    category: 'produtividade',
    prompt: 'Revise o texto abaixo tornando-o mais direto, elegante e profissional, sem perder a intenção original: ',
  },
  {
    id: 'riscos',
    title: 'Mapear riscos',
    category: 'analise',
    prompt: 'Identifique os principais riscos, gargalos e suposições frágeis no seguinte plano: ',
  },
];
