import { Fragment } from "react";

/**
 * Renderizador de Markdown minimalista para los mensajes de LABDEX AI.
 *
 * El proyecto no tiene ninguna librería de Markdown instalada (Fase 5,
 * §28: evitar dependencias innecesarias) y las respuestas de Gemini usan
 * un subconjunto razonablemente predecible de Markdown (encabezados,
 * negritas/cursivas, listas, bloques de código, código en línea y
 * enlaces), así que se implementa aquí un parser línea por línea en vez de
 * añadir una dependencia nueva solo para esto.
 */

function renderInline(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  // Orden de prioridad: código en línea, negrita, cursiva, enlaces.
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-text">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            {linkMatch[1]}
          </a>
        );
      }
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

interface Block {
  type: "heading" | "list" | "code" | "paragraph";
  level?: number;
  items?: string[];
  lang?: string;
  content: string;
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // saltar el cierre ```
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(line);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items, content: "" });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("```") && !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", content: paragraphLines.join(" ") });
  }

  return blocks;
}

const headingClasses: Record<number, string> = {
  1: "text-lg font-semibold text-text mt-4 mb-2",
  2: "text-base font-semibold text-text mt-4 mb-1.5",
  3: "text-sm font-semibold uppercase tracking-wide text-text-muted mt-3 mb-1",
  4: "text-sm font-semibold text-text mt-3 mb-1",
};

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-text">
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.type === "heading") {
          const level = block.level ?? 2;
          return (
            <p key={key} className={headingClasses[level] ?? headingClasses[2]}>
              {renderInline(block.content, key)}
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={key} className="ml-5 list-disc space-y-1">
              {(block.items ?? []).map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "code") {
          return (
            <pre
              key={key}
              className="overflow-x-auto rounded-md border border-border bg-bg-raised p-3 font-mono text-xs text-text"
            >
              <code>{block.content}</code>
            </pre>
          );
        }
        return (
          <p key={key}>
            <Fragment>{renderInline(block.content, key)}</Fragment>
          </p>
        );
      })}
    </div>
  );
}
