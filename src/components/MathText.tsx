import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
}

type Segment =
  | { type: 'text'; content: string }
  | { type: 'inline'; content: string }
  | { type: 'block'; content: string };

/**
 * Memisahkan teks biasa, rumus display block ($$...$$), dan rumus inline ($...$).
 * Mengabaikan tanda dollar tunggal yang tidak berpasangan atau ter-escape (\$).
 */
function parseMathSegments(input: string): Segment[] {
  if (!input) return [];

  const segments: Segment[] = [];
  const regex = /\\\$|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: input.slice(lastIndex, match.index),
      });
    }

    if (match[0] === '\\$') {
      segments.push({ type: 'text', content: '$' });
    } else if (match[1] !== undefined) {
      segments.push({ type: 'block', content: match[1].trim() });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'inline', content: match[2].trim() });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({
      type: 'text',
      content: input.slice(lastIndex),
    });
  }

  return segments;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  const segments = useMemo(() => parseMathSegments(text), [text]);

  return (
    <span className={`break-words ${className}`}>
      {segments.map((seg, index) => {
        if (seg.type === 'text') {
          return <React.Fragment key={index}>{seg.content}</React.Fragment>;
        }

        if (seg.type === 'block') {
          const html = katex.renderToString(seg.content, {
            displayMode: true,
            throwOnError: false,
            strict: 'ignore',
          });
          return (
            <span
              key={index}
              className="block my-2.5 max-w-full overflow-x-auto overscroll-x-contain py-1"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        const html = katex.renderToString(seg.content, {
          displayMode: false,
          throwOnError: false,
          strict: 'ignore',
        });
        const isWideInline =
          seg.content.length > 26 ||
          /\\(begin|int|sum|frac|prod|lim)/.test(seg.content);

        return (
          <span
            key={index}
            className={
              isWideInline
                ? 'katex-inline-wrap inline-block max-w-full overflow-x-auto align-middle py-0.5'
                : 'katex-inline-wrap inline align-baseline'
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
};
