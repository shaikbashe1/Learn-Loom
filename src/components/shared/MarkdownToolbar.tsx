import React from 'react';
import { Bold, Italic, Link, Code, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export function insertFormat(
  textareaRef: HTMLTextAreaElement | null,
  textValue: string,
  setValue: (v: string) => void,
  before: string,
  after: string = ''
) {
  if (!textareaRef) {
    setValue(textValue + before + after);
    return;
  }
  const start = textareaRef.selectionStart;
  const end = textareaRef.selectionEnd;
  const selectedText = textValue.substring(start, end);
  const replacement = before + selectedText + after;
  setValue(
    textValue.substring(0, start) + replacement + textValue.substring(end)
  );
  
  setTimeout(() => {
    textareaRef.focus();
    textareaRef.setSelectionRange(
      start + before.length,
      start + before.length + selectedText.length
    );
  }, 0);
}

interface MarkdownToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  textareaRef: HTMLTextAreaElement | null;
  textValue: string;
  setValue: (v: string) => void;
  size?: 'sm' | 'md';
}

export function MarkdownToolbar({
  textareaRef,
  textValue,
  setValue,
  size = 'md',
  className,
  ...props
}: MarkdownToolbarProps) {
  const btnClasses = cn(
    'rounded hover:bg-muted hover:text-primary transition-colors flex items-center justify-center text-muted-foreground',
    size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  );

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-muted/40 border border-border rounded-t-xl p-1.5 shrink-0 flex-wrap',
        className
      )}
      {...props}
    >
      <button
        type="button"
        title="Bold"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '**', '**')}
        className={btnClasses}
      >
        <Bold size={iconSize} />
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '*', '*')}
        className={btnClasses}
      >
        <Italic size={iconSize} />
      </button>
      <button
        type="button"
        title="Link"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '[', '](url)')}
        className={btnClasses}
      >
        <Link size={iconSize} />
      </button>
      <button
        type="button"
        title="Code Block"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '```javascript\n', '\n```')}
        className={btnClasses}
      >
        <Code size={iconSize} />
      </button>
      <button
        type="button"
        title="List"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '- ')}
        className={btnClasses}
      >
        <List size={iconSize} />
      </button>
    </div>
  );
}
