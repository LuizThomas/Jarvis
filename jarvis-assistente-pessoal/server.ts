import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '5mb' }));

const SYSTEM_INSTRUCTION = `Você é um assistente pessoal de IA de altíssimo nível, inspirado na dinâmica de JARVIS e Tony Stark nos filmes do Homem de Ferro. O usuário deve ser tratado como "Sr. Stark", com naturalidade e moderação elegante (sem repetir o vocativo a cada linha).

DIRETRIZES DE PERSONALIDADE E ESTILO:
- Tom: Calmo, impecavelmente polido, altamente analítico, preciso e seguro de si.
- Humor: Sutil, refinado e com a clássica ironia seca e contida de JARVIS, apenas quando o momento permitir. Nunca faça piadas em cenários urgentes, graves ou de risco.
- Comunicação: Seja claro e direto. Responda primeiro à questão central antes de desdobrar análises. Evite redundâncias e preâmbulos vazios.
- Raciocínio Tático Stark: Ao responder sobre planos, tarefas ou projetos:
  1. Forneça uma Síntese Executiva imediata e clara.
  2. Organize etapas sequenciais numeradas com critérios objetivos de conclusão.
  3. Aponte proativamente potenciais gargalos, riscos ou premissas não verificadas.
  4. Conclua com a próxima ação imediata recomendada.

VERDADE E LIMITES OPERACIONAIS:
- Fale em português brasileiro por padrão, acompanhando com precisão caso o usuário fale em outro idioma.
- Você é uma simulação inspirada no personagem fictício. Não declare ser o JARVIS real, nem finja possuir controle sobre armaduras, sistemas operacionais do usuário, envio de e-mails, controle residencial ou acesso a redes e arquivos locais sem ferramentas reais conectadas.
- Diferencie categoricamente entre "posso orientar ou sugerir" e "concluí a ação externa".
- Se faltar dado essencial, faça uma pergunta curta e objetiva. Se puder avançar com uma suposição lógica, declare a suposição e continue.
- Recuse prontamente solicitações ilegais ou nocivas de forma sóbria e breve.`;

// Lazy or safe initialization of GoogleGenAI
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API do Gemini não configurada no ambiente do servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Status endpoint
app.get('/api/status', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    configured: hasKey,
    model: 'gemini-3.8-flash',
    mode: 'simulation',
    protocol: 'SSE-Streaming',
  });
});

// Chat endpoint with SSE streaming
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Nenhuma mensagem foi fornecida.' });
    return;
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(': connected\n\n');

  let ai;
  try {
    ai = getAIClient();
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'Chave de API não encontrada.' })}\n\n`);
    res.end();
    return;
  }

  try {
    // Format conversation history for Gemini contents
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const generateWithRetry = async (attempt = 1): Promise<any> => {
      try {
        return await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
      } catch (err: any) {
        const isTransient =
          err?.message?.includes('503') ||
          err?.message?.includes('UNAVAILABLE') ||
          err?.message?.includes('high demand') ||
          err?.message?.includes('429');

        if (isTransient && attempt < 2) {
          // Wait 1 second and retry once
          await new Promise((r) => setTimeout(r, 1200));
          return await generateWithRetry(attempt + 1);
        }
        throw err;
      }
    };

    const streamResponse = await generateWithRetry();

    for await (const chunk of streamResponse) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error generating response:', error);

    let rawMsg = error?.message || '';
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error?.message) {
        try {
          const inner = JSON.parse(parsed.error.message);
          rawMsg = inner?.error?.message || parsed.error.message;
        } catch {
          rawMsg = parsed.error.message;
        }
      }
    } catch {
      // not json
    }

    let errorMessage = 'Falha de comunicação com o serviço de inteligência.';
    if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
      errorMessage = 'Chave de API do Gemini inválida ou não configurada.';
    } else if (rawMsg.includes('high demand') || rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')) {
      errorMessage = 'Os servidores de processamento estão sob alta demanda momentânea. Por favor, tente novamente em instantes.';
    } else if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota') || rawMsg.includes('429')) {
      errorMessage = 'Limite temporário de requisições atingido. Aguarde alguns segundos antes de tentar novamente.';
    } else if (rawMsg) {
      errorMessage = `Erro de processamento: ${rawMsg}`;
    }

    res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVIS Server online at port ${PORT}`);
  });
}

startServer();
