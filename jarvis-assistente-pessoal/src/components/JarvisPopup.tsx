import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  RotateCcw,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  Minus,
  GripHorizontal,
  AlertCircle,
  Sparkles,
  Download,
  ShieldCheck,
  ExternalLink,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Radio,
} from 'lucide-react';
import { ChatMessage, QuickPrompt } from '../types';
import { FormattedText } from '../utils/formatText';
import { QUICK_PROMPTS } from '../utils/quickActions';
import { JarvisEmblem } from './JarvisEmblem';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  speakJarvisText,
  stopSpeaking,
} from '../utils/speech';

interface JarvisPopupProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onOpen: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  initialPrompt?: string;
  onPromptConsumed?: () => void;
  isCompanionMode?: boolean;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'jarvis-init',
  role: 'model',
  content:
    'À sua disposição, Sr. Stark. Sistemas em prontidão para organizar tarefas, analisar planos ou sintetizar informações. Em que posso auxiliá-lo agora?',
  timestamp: Date.now(),
  status: 'done',
};

const STORAGE_KEY = 'jarvis_session_chat_v1';

export function JarvisPopup({
  isOpen,
  isMinimized,
  onClose,
  onOpen,
  onMinimize,
  onRestore,
  initialPrompt,
  onPromptConsumed,
  isCompanionMode = false,
}: JarvisPopupProps) {
  // Session messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [INITIAL_MESSAGE];
  });

  const [input, setInput] = useState('');
  const [preservedDraft, setPreservedDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognizerRef = useRef<any>(null);

  // Dragging state for main popup & minimized orb
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef<{
    startX: number;
    startY: number;
    initialLeft: number;
    initialTop: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
    hasMoved: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const minimizedRef = useRef<HTMLDivElement>(null);

  // Sync messages to localStorage & cross-tab events
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Listen for storage events from companion window
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0 && !isMinimized) {
      scrollToBottom(true);
    }
  }, [messages, isLoading, isMinimized, scrollToBottom]);

  // Handle external prompt
  useEffect(() => {
    if (initialPrompt && isOpen) {
      onRestore();
      setInput(initialPrompt);
      if (onPromptConsumed) onPromptConsumed();
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(initialPrompt.length, initialPrompt.length);
      }, 50);
    }
  }, [initialPrompt, isOpen, onPromptConsumed, onRestore]);

  // Escape key closes/minimizes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (confirmClearOpen) {
          setConfirmClearOpen(false);
        } else if (!isMinimized && !isCompanionMode) {
          onMinimize();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmClearOpen, isMinimized, isCompanionMode, onMinimize, onClose]);

  // Window resize bounds clamping
  useEffect(() => {
    const handleResize = () => {
      if (!position) return;
      const el = popupRef.current || minimizedRef.current;
      const width = el?.offsetWidth ?? 440;
      const height = el?.offsetHeight ?? 620;

      const maxX = Math.max(10, window.innerWidth - width - 10);
      const maxY = Math.max(10, window.innerHeight - height - 10);

      setPosition((prev) => {
        if (!prev) return null;
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Dragging the main popup header
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, textarea, input, a, [role="button"]')) {
      return;
    }
    const targetEl = popupRef.current;
    if (!targetEl || isExpanded) return;

    const rect = targetEl.getBoundingClientRect();
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
      hasMoved: false,
    };

    setIsDragging(true);

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - dragInfoRef.current.startX;
      const dy = moveEvt.clientY - dragInfoRef.current.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragInfoRef.current.hasMoved = true;
      }

      const w = targetEl.offsetWidth;
      const h = targetEl.offsetHeight;

      const minX = 8;
      const minY = 8;
      const maxX = Math.max(8, window.innerWidth - w - 8);
      const maxY = Math.max(8, window.innerHeight - h - 8);

      const nextX = Math.min(Math.max(minX, dragInfoRef.current.initialLeft + dx), maxX);
      const nextY = Math.min(Math.max(minY, dragInfoRef.current.initialTop + dy), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Dragging the Minimized JARVIS Emblem
  const handleMinimizedPointerDown = (e: React.PointerEvent) => {
    const targetEl = minimizedRef.current;
    if (!targetEl) return;

    // Capture pointer on target
    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch {}

    const rect = targetEl.getBoundingClientRect();
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
      hasMoved: false,
    };

    setIsDragging(true);

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - dragInfoRef.current.startX;
      const dy = moveEvt.clientY - dragInfoRef.current.startY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragInfoRef.current.hasMoved = true;
      }

      const w = targetEl.offsetWidth || 64;
      const h = targetEl.offsetHeight || 64;

      const minX = 8;
      const minY = 8;
      const maxX = Math.max(8, window.innerWidth - w - 8);
      const maxY = Math.max(8, window.innerHeight - h - 8);

      const nextX = Math.min(Math.max(minX, dragInfoRef.current.initialLeft + dx), maxX);
      const nextY = Math.min(Math.max(minY, dragInfoRef.current.initialTop + dy), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const onPointerUp = (upEvt: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(upEvt.pointerId);
      } catch {}

      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // If user merely clicked without dragging, restore full popup!
      if (!dragInfoRef.current.hasMoved) {
        onRestore();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Copy text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Speak JARVIS response
  const handleToggleSpeak = (id: string, text: string) => {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(id);
      speakJarvisText(
        text,
        () => setSpeakingId(id),
        () => setSpeakingId(null)
      );
    }
  };

  // Speech Recognition (Voice Dictation)
  const handleToggleListening = () => {
    if (!isSpeechRecognitionSupported()) {
      setSystemNotice('Reconhecimento de voz não suportado neste navegador.');
      setTimeout(() => setSystemNotice(null), 3000);
      return;
    }

    if (isListening && recognizerRef.current) {
      recognizerRef.current.stop();
      setIsListening(false);
      return;
    }

    const rec = createSpeechRecognizer(
      (transcript) => {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      },
      () => {
        setIsListening(false);
      },
      (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      }
    );

    if (rec) {
      recognizerRef.current = rec;
      rec.start();
      setIsListening(true);
    }
  };

  // Always-On-Top Feature: Document Picture-in-Picture or Detached Window
  const handlePopoutAlwaysOnTop = async () => {
    // 1. Try Document Picture-in-Picture API if available (Chrome / Edge)
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 440,
          height: 640,
        });

        // Copy styles
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (sheet.href) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = sheet.href;
              pipWindow.document.head.appendChild(link);
            } else if (sheet.cssRules) {
              const style = document.createElement('style');
              Array.from(sheet.cssRules).forEach((rule) => {
                style.appendChild(document.createTextNode(rule.cssText));
              });
              pipWindow.document.head.appendChild(style);
            }
          } catch {}
        });

        // Set document title
        pipWindow.document.title = 'JARVIS • Sempre Visível (PiP)';
        pipWindow.document.body.className =
          'bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden m-0 p-0';

        // Create container and notify user
        const pipContainer = pipWindow.document.createElement('div');
        pipContainer.id = 'pip-root';
        pipWindow.document.body.appendChild(pipContainer);

        // Close in main view and open detached
        setSystemNotice('JARVIS em modo Picture-in-Picture (sempre no topo sobre outras abas).');
        setTimeout(() => setSystemNotice(null), 4000);
      } catch (err) {
        console.warn('PiP failed, falling back to companion window:', err);
      }
    }

    // 2. Open detached companion window (supported in all browsers)
    const url = `${window.location.origin}${window.location.pathname}?mode=companion`;
    window.open(
      url,
      'JARVIS_Companion',
      'width=440,height=650,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
  };

  // Export transcript
  const handleExportTranscript = () => {
    const lines = messages.map((m) => {
      const author = m.role === 'user' ? 'Sr. Stark' : 'JARVIS';
      const time = new Date(m.timestamp).toLocaleTimeString();
      return `[${time}] ${author}:\n${m.content}\n`;
    });

    const blob = new Blob([lines.join('\n---\n\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jarvis_sessao_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear chat
  const handleConfirmClear = () => {
    setMessages([INITIAL_MESSAGE]);
    setConfirmClearOpen(false);
    setLastFailedMessage(null);
    setPreservedDraft('');
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setSystemNotice('Histórico da sessão reiniciado.');
    setTimeout(() => setSystemNotice(null), 3500);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || isLoading) return;

    setPreservedDraft(content);
    setLastFailedMessage(null);

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'done',
    };

    const assistantPlaceholderId = `jarvis-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, assistantMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Fluxo de resposta vazio.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let streamBuffer = '';
      let streamFinished = false;

      while (!streamFinished) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: [DONE]')) {
            streamFinished = true;
            break;
          }

          if (trimmed.startsWith('event: error')) {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantPlaceholderId
                      ? { ...msg, content: accumulatedText, status: 'streaming' }
                      : msg
                  )
                );
              }
            } catch (jsonErr: any) {
              if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                throw jsonErr;
              }
            }
          }
        }
      }

      if (!accumulatedText.trim()) {
        throw new Error('Nenhuma resposta foi gerada pelo modelo.');
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantPlaceholderId
            ? { ...msg, content: accumulatedText, status: 'done' }
            : msg
        )
      );
      setPreservedDraft('');
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg =
        err.message || 'Houve uma falha na conexão com os servidores de IA.';

      setLastFailedMessage(content);
      setInput(content);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantPlaceholderId
            ? {
                ...msg,
                status: 'error',
                errorMessage: errorMsg,
                content:
                  'Sr. Stark, identifiquei uma interrupção na conexão com o modelo de processamento. A sua mensagem foi preservada abaixo para nova tentativa.',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    } else if (preservedDraft) {
      handleSendMessage(preservedDraft);
    }
  };

  const handleApplyQuickPrompt = (qp: QuickPrompt) => {
    setInput(qp.prompt);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 1. COMPLETELY CLOSED LAUNCHER (When user clicked X or page just loaded)
  if (!isOpen && !isCompanionMode) {
    return (
      <button
        onClick={() => {
          onOpen();
          onRestore();
        }}
        aria-label="Abrir assistente JARVIS"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-zinc-900 border border-cyan-500/40 px-4 py-3 text-zinc-100 shadow-xl shadow-cyan-950/40 hover:border-cyan-400 hover:bg-zinc-850 hover:shadow-cyan-500/25 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
        </span>
        <div className="flex flex-col text-left">
          <span className="font-semibold text-xs tracking-wider text-cyan-300 font-mono">JARVIS</span>
          <span className="text-[10px] text-zinc-400">Atender Sr. Stark</span>
        </div>
      </button>
    );
  }

  // 2. MINIMIZED FLOATING JARVIS EMBLEM (Arc Reactor HUD Core)
  // Fully flexible and movable anywhere on screen!
  if (isMinimized && !isCompanionMode) {
    const minimizedStyle: React.CSSProperties = position
      ? { left: `${position.x}px`, top: `${position.y}px` }
      : {};

    return (
      <div
        ref={minimizedRef}
        style={minimizedStyle}
        onPointerDown={handleMinimizedPointerDown}
        aria-label="Núcleo flutuante do JARVIS (Arraste para mover, clique para restaurar)"
        className={`fixed z-50 group select-none touch-none ${
          !position ? 'bottom-6 right-6' : ''
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="relative flex items-center justify-center p-2 rounded-full bg-zinc-950/90 border-2 border-cyan-500/60 shadow-2xl shadow-cyan-950/80 hover:border-cyan-400 hover:scale-105 active:scale-95 transition-transform backdrop-blur-md">
          <JarvisEmblem isLoading={isLoading} size="md" />

          {/* Holographic Tooltip on hover */}
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md bg-zinc-900 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>JARVIS • Clique p/ restaurar | Arraste p/ mover</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. FULL POPUP WINDOW OR COMPANION WINDOW
  const popupStyle: React.CSSProperties = isCompanionMode
    ? { width: '100vw', height: '100vh', inset: 0, borderRadius: 0 }
    : isExpanded
    ? {}
    : position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
    : {};

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Janela do assistente JARVIS"
      ref={popupRef}
      style={popupStyle}
      className={`fixed z-50 flex flex-col bg-zinc-900 border border-zinc-750 shadow-2xl shadow-black/85 transition-[width,height,transform] duration-150 ${
        isCompanionMode
          ? 'w-screen h-screen inset-0 rounded-none'
          : isExpanded
          ? 'inset-3 sm:inset-6 md:inset-10 rounded-xl'
          : `${!position ? 'bottom-4 right-4 sm:bottom-6 sm:right-6' : ''} w-[94vw] sm:w-[460px] h-[85vh] sm:h-[640px] max-h-[720px] rounded-xl`
      }`}
    >
      {/* Draggable Header */}
      <header
        onPointerDown={handleHeaderPointerDown}
        className={`flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-950/80 ${
          isCompanionMode ? 'rounded-none' : 'rounded-t-xl'
        } select-none touch-none ${
          !isExpanded && !isCompanionMode ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
      >
        <div className="flex items-center gap-2.5 pointer-events-none">
          <div className="relative">
            <JarvisEmblem isLoading={isLoading} size="sm" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 tracking-wider font-mono flex items-center gap-1.5">
                JARVIS
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {isCompanionMode ? 'Acompanhante' : 'Online'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
              Sr. Stark • Assistente Pessoal
            </p>
          </div>
        </div>

        {/* Drag Hint indicator in center */}
        {!isExpanded && !isCompanionMode && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-400 font-mono select-none pointer-events-none">
            <GripHorizontal className="w-4 h-4 text-zinc-500" />
            <span>Mover</span>
          </div>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-0.5">
          {/* Always-on-top PiP / Companion Window Button */}
          {!isCompanionMode && (
            <button
              type="button"
              onClick={handlePopoutAlwaysOnTop}
              title="Destacar janela (acompanha outras abas e programas)"
              aria-label="Destacar janela do assistente para acompanhar outras abas"
              className="p-1.5 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleExportTranscript}
            title="Exportar conversa da sessão"
            aria-label="Exportar histórico da conversa"
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            title="Iniciar nova conversa"
            aria-label="Limpar e iniciar nova conversa"
            className="p-1.5 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Diminuir / Minimizar para o símbolo JARVIS */}
          {!isCompanionMode && (
            <button
              type="button"
              onClick={onMinimize}
              title="Diminuir janela (recolher para o símbolo móvel JARVIS)"
              aria-label="Diminuir janela para símbolo JARVIS"
              className="p-1.5 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Expandir / Restaurar */}
          {!isCompanionMode && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Restaurar tamanho' : 'Expandir janela'}
              aria-label={isExpanded ? 'Restaurar tamanho da janela' : 'Expandir janela'}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 hidden sm:block"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Fechar */}
          <button
            type="button"
            onClick={onClose}
            title="Fechar (Esc)"
            aria-label="Fechar janela pop-up"
            className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Confirmation Dialog to Clear Chat */}
      {confirmClearOpen && (
        <div className="absolute inset-0 z-20 bg-zinc-950/85 backdrop-blur-xs flex items-center justify-center p-6 rounded-xl">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-lg p-5 max-w-sm w-full shadow-2xl text-left">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Reiniciar sessão?
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              O histórico visível da conversa atual será apagado desta sessão. Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              >
                Confirmar reinício
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Toast / Alert if any */}
      {systemNotice && (
        <div className="bg-cyan-950/70 border-b border-cyan-800/50 px-3.5 py-1.5 text-[11px] text-cyan-300 flex items-center justify-between">
          <span>{systemNotice}</span>
          <button
            type="button"
            onClick={() => setSystemNotice(null)}
            className="text-cyan-400 hover:text-cyan-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm" tabIndex={0} aria-label="Histórico de mensagens">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              {/* Message author & timestamp header */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-300 font-mono">
                  {isUser ? 'Sr. Stark' : 'JARVIS'}
                </span>
                <span>•</span>
                <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                {!isUser && message.content && (
                  <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Speak Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleSpeak(message.id, message.content)}
                      title={speakingId === message.id ? 'Parar áudio' : 'Ouvir resposta (Voz JARVIS)'}
                      aria-label="Ouvir resposta com voz"
                      className="p-0.5 rounded text-zinc-400 hover:text-cyan-300"
                    >
                      {speakingId === message.id ? (
                        <VolumeX className="w-3 h-3 text-cyan-400 animate-pulse" />
                      ) : (
                        <Volume2 className="w-3 h-3" />
                      )}
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(message.id, message.content)}
                      title="Copiar resposta"
                      aria-label="Copiar mensagem"
                      className="p-0.5 rounded text-zinc-400 hover:text-zinc-200"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Message bubble */}
              <div
                className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-zinc-100 shadow-sm ${
                  isUser
                    ? 'bg-cyan-950/50 border border-cyan-800/40 text-cyan-50'
                    : message.status === 'error'
                    ? 'bg-red-950/40 border border-red-800/40 text-red-200'
                    : 'bg-zinc-850 border border-zinc-800 text-zinc-200'
                }`}
              >
                {message.status === 'streaming' && !message.content ? (
                  <div className="flex items-center gap-2 py-1 text-xs text-cyan-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="italic font-mono">JARVIS calculando diretrizes...</span>
                  </div>
                ) : (
                  <FormattedText content={message.content} />
                )}

                {/* Error Box with Retry inside the bubble */}
                {message.status === 'error' && (
                  <div className="mt-3 pt-2 border-t border-red-800/30 flex items-center justify-between text-xs">
                    <span className="text-red-300 text-[11px]">
                      {message.errorMessage || 'Falha na conexão'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="inline-flex items-center gap-1 bg-red-900/60 hover:bg-red-900 border border-red-700/60 text-red-100 px-2 py-1 rounded font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Tentar novamente
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Global Loading Indicator when assistant is generating */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-1 pl-1">
            <span className="flex space-x-1">
              <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" />
            </span>
            <span className="font-mono text-[11px] text-cyan-400/80">JARVIS respondendo...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Suggestions (Pills) */}
      <div className="px-3 py-2 border-t border-zinc-800/60 bg-zinc-950/40">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <span className="text-zinc-400 text-[10px] uppercase font-semibold flex items-center gap-1 pl-1 shrink-0 font-mono">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Ações:
          </span>
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.id}
              type="button"
              onClick={() => handleApplyQuickPrompt(qp)}
              className="shrink-0 px-2.5 py-1 rounded bg-zinc-800/70 hover:bg-zinc-750 text-zinc-300 hover:text-cyan-200 border border-zinc-700/50 hover:border-cyan-500/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            >
              {qp.title}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <footer className="p-3 border-t border-zinc-800 bg-zinc-950/80 rounded-b-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative"
        >
          <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-750 rounded-lg p-2 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Ouvindo seus comandos, Sr. Stark...' : 'Instrua o assistente... (Enter envia)'}
              aria-label="Campo de mensagem para o assistente JARVIS"
              disabled={isLoading}
              className="w-full resize-none bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[140px] leading-relaxed"
            />

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleListening}
              title={isListening ? 'Parar gravação' : 'Falar por voz (Microfone)'}
              aria-label="Ditar comando por voz"
              className={`shrink-0 h-8 w-8 rounded flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                  : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-cyan-300'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Enviar mensagem"
              className="shrink-0 h-8 w-8 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Footer note & disclaimer */}
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-400">
            <div className="flex items-center gap-1 text-zinc-400">
              <ShieldCheck className="w-3 h-3 text-cyan-500/70" />
              <span>Simulação JARVIS • Chave protegida</span>
            </div>
            <span>Enter = Enviar • Shift+Enter = Quebra</span>
          </div>
        </form>
      </footer>
    </div>
  );
}
