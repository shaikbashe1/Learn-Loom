import React from 'react';
import { sanitizeHtml } from './sanitize';

export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split by code blocks: ```[lang]\n[code]\n```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // It's a code block
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={index} className="relative my-4 group/code">
              {lang && (
                <div className="absolute right-3 top-3 text-[10px] uppercase font-bold text-muted-foreground bg-surface border border-border px-2 py-0.5 rounded shadow-sm select-none">
                  {lang}
                </div>
              )}
              <pre className="bg-surface-container-low border border-border-base p-4 rounded-xl font-mono text-[13px] sm:text-[14px] overflow-x-auto text-text-primary shadow-inner max-w-full">
                <code>{code.trim()}</code>
              </pre>
            </div>
          );
        } else {
          // Standard text, apply regex inline formats
          const html = formatTextMarkdown(part);
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
            />
          );
        }
      })}
    </>
  );
}

function formatTextMarkdown(text: string): string {
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="bg-surface-container-high border border-border px-1.5 py-0.5 rounded font-mono text-[13px] text-primary">$1</code>');

  // Bold: **text**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links: [text](url)
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline font-semibold" target="_blank" rel="noopener noreferrer">$1</a>');

  // Headings: ### text, ## text, # text
  escaped = escaped.replace(/^### (.*)$/gm, '<h4 class="text-lg font-bold text-text-primary mt-3 mb-1.5">$1</h4>');
  escaped = escaped.replace(/^## (.*)$/gm, '<h3 class="text-xl font-bold text-text-primary mt-4 mb-2">$1</h3>');
  escaped = escaped.replace(/^# (.*)$/gm, '<h2 class="text-2xl font-bold text-text-primary mt-5 mb-2.5">$1</h2>');

  // Bullet Lists: - item or * item
  escaped = escaped.replace(/^\s*-\s+(.*)$/gm, '<li class="ml-4 list-disc text-text-secondary">$1</li>');

  // Line breaks to paragraphs
  const paragraphs = escaped.split(/\n\n+/);
  return paragraphs
    .map(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith('<li') || trimmed.startsWith('<h')) {
        return p; // don't wrap list items or headers in <p>
      }
      return `<p class="mb-3 leading-relaxed">${p.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}
