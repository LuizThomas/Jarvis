export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  status?: 'sending' | 'streaming' | 'done' | 'error';
  errorMessage?: string;
}

export interface QuickPrompt {
  id: string;
  title: string;
  category: 'planejamento' | 'produtividade' | 'analise';
  prompt: string;
}
