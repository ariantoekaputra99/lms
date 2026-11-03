import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

// Open links written by instructors in a new tab, without giving the new page access to this one.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** Renders instructor-authored Markdown. Output is sanitized, so raw HTML/scripts in content are stripped. */
export function Markdown({ text, className }: { text?: string | null; className?: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(text ?? '', { async: false }) as string), [text]);
  if (!text) return null;
  return <div className={`prose prose-slate max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100 ${className ?? ''}`}
    dangerouslySetInnerHTML={{ __html: html }} />;
}
