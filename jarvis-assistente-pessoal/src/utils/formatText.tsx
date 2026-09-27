import React from 'react';

/**
 * Lightweight, safe formatter for assistant responses.
 * Renders bold, code blocks, bullet points, numbered lists and paragraphs
 * without pulling in heavy external markdown dependencies.
 */
export function FormattedText({ content }: { content: string }) {
  if (!content) return null;

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0]?.trim();
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const lang = hasLang ? firstLine : '';
          const code = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div key={index} className="my-2 rounded border border-zinc-800 bg-zinc-950/80 p-2.5 font-mono text-xs overflow-x-auto text-zinc-300">
              {lang && <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-semibold">{lang}</div>}
              <pre className="whitespace-pre">{code}</pre>
            </div>
          );
        }

        // Split text by lines
        const lines = part.split('\n');
        return (
          <React.Fragment key={index}>
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lIdx} className="h-1.5" />;
              }

              // Check if bullet point
              if (/^[-*•]\s+/.test(trimmed)) {
                const itemText = trimmed.replace(/^[-*•]\s+/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1 my-0.5">
                    <span className="text-cyan-400 font-bold select-none">•</span>
                    <span>{renderInlineStyles(itemText)}</span>
                  </div>
                );
              }

              // Check if numbered list (e.g., "1. ")
              const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
              if (numberedMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1 my-0.5">
                    <span className="font-mono text-xs text-cyan-400 font-semibold select-none min-w-[1.2rem] pt-0.5">
                      {numberedMatch[1]}.
                    </span>
                    <span>{renderInlineStyles(numberedMatch[2])}</span>
                  </div>
                );
              }

              // Check if header (### or ##)
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="text-sm font-semibold text-zinc-200 mt-2 mb-1">
                    {renderInlineStyles(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="text-sm font-bold text-zinc-100 mt-2.5 mb-1 text-cyan-300">
                    {renderInlineStyles(trimmed.slice(3))}
                  </h3>
                );
              }

              return (
                <p key={lIdx} className="my-0.5">
                  {renderInlineStyles(line)}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function renderInlineStyles(text: string): React.ReactNode {
  // Matches inline code `code` and bold **bold**
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return tokens.map((token, i) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-xs text-cyan-300 border border-zinc-700/60">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {token.slice(2, -2)}
        </strong>
      );
    }
    return token;
  });
}
