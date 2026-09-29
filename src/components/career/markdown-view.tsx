import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal GitHub-flavored Markdown renderer covering what the AI report uses:
 * headings, paragraphs, nested/ordered/task lists, tables, blockquotes, code,
 * horizontal rules and inline emphasis/links. Renders React elements only.
 */

type Align = "left" | "center" | "right" | null;

interface ListItem {
  text: string;
  checked: boolean | null;
  children: Block[];
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; code: string }
  | { type: "hr" }
  | { type: "blockquote"; children: Block[] }
  | { type: "table"; header: string[]; align: Align[]; rows: string[][] }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const FENCE = /^\s*(```|~~~)/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function isBlockStart(line: string, next?: string): boolean {
  return (
    HEADING.test(line) ||
    HR.test(line) ||
    FENCE.test(line) ||
    LIST_ITEM.test(line) ||
    line.trimStart().startsWith(">") ||
    (line.includes("|") && next !== undefined && TABLE_SEPARATOR.test(next))
  );
}

interface ListEntry {
  indent: number;
  ordered: boolean;
  start: number;
  text: string;
}

function buildList(entries: ListEntry[], from: number): { block: Block; next: number } {
  const base = entries[from];
  const items: ListItem[] = [];
  let i = from;
  while (i < entries.length && entries[i].indent >= base.indent) {
    const entry = entries[i];
    if (entry.indent > base.indent) {
      const nested = buildList(entries, i);
      items[items.length - 1]?.children.push(nested.block);
      i = nested.next;
      continue;
    }
    const task = entry.text.match(/^\[([ xX])\]\s+(.*)$/);
    items.push({
      text: task ? task[2] : entry.text,
      checked: task ? task[1].toLowerCase() === "x" : null,
      children: [],
    });
    i++;
  }
  return { block: { type: "list", ordered: base.ordered, start: base.start, items }, next: i };
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (FENCE.test(line)) {
      const fence = line.trim().slice(0, 3);
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) code.push(lines[i++]);
      i++;
      blocks.push({ type: "code", code: code.join("\n") });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (line.trimStart().startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith(">")) {
        quoted.push(lines[i++].trimStart().replace(/^>\s?/, ""));
      }
      blocks.push({ type: "blockquote", children: parseMarkdown(quoted.join("\n")) });
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      const header = splitRow(line);
      const align: Align[] = splitRow(lines[i + 1]).map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        return left && right ? "center" : right ? "right" : left ? "left" : null;
      });
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i++]));
      }
      blocks.push({ type: "table", header, align, rows });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const entries: ListEntry[] = [];
      while (i < lines.length) {
        const current = lines[i];
        const item = current.match(LIST_ITEM);
        if (item) {
          const marker = item[2];
          const ordered = /\d/.test(marker);
          entries.push({
            indent: item[1].replace(/\t/g, "    ").length,
            ordered,
            start: ordered ? parseInt(marker, 10) : 1,
            text: item[3],
          });
          i++;
        } else if (current.trim() && /^\s+/.test(current) && entries.length) {
          entries[entries.length - 1].text += ` ${current.trim()}`;
          i++;
        } else if (!current.trim() && i + 1 < lines.length && LIST_ITEM.test(lines[i + 1])) {
          i++;
        } else {
          break;
        }
      }
      let from = 0;
      while (from < entries.length) {
        const { block, next } = buildList(entries, from);
        blocks.push(block);
        from = next;
      }
      continue;
    }

    const paragraph: string[] = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) {
      paragraph.push(lines[i++].trim());
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

const INLINE =
  /(`[^`]+`)|(\*\*[^*]+?\*\*|__[^_]+?__)|(~~[^~]+?~~)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*?\*|(?<!\w)_[^_\s][^_]*?_(?!\w))|(https?:\/\/[^\s)<]+[^\s)<.,;:!?])/;

function safeHref(url: string): string | null {
  return /^(https?:|mailto:|\/|#)/i.test(url) ? url : null;
}

function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let k = 0;

  while (rest) {
    const match = rest.match(INLINE);
    if (!match || match.index === undefined) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${k++}`;

    if (match[1]) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {renderInline(token.slice(2, -2), key)}
        </strong>,
      );
    } else if (match[3]) {
      nodes.push(<del key={key}>{renderInline(token.slice(2, -2), key)}</del>);
    } else if (match[4]) {
      const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      const href = safeHref(url);
      nodes.push(
        href ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4"
          >
            {renderInline(label, key)}
          </a>
        ) : (
          <Fragment key={key}>{renderInline(label, key)}</Fragment>
        ),
      );
    } else if (match[5]) {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    } else {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary underline underline-offset-4"
        >
          {token}
        </a>,
      );
    }
    rest = rest.slice(match.index + token.length);
  }

  return nodes;
}

const HEADING_CLASSES: Record<number, string> = {
  1: "mt-8 mb-4 text-2xl font-bold tracking-tight",
  2: "mt-10 mb-4 border-b pb-2 text-xl font-semibold tracking-tight first:mt-0",
  3: "mt-6 mb-3 text-lg font-semibold",
  4: "mt-5 mb-2 text-base font-semibold",
  5: "mt-4 mb-2 text-sm font-semibold",
  6: "mt-4 mb-2 text-sm font-semibold text-muted-foreground",
};

function renderBlocks(blocks: Block[], keyPrefix = "b"): ReactNode[] {
  return blocks.map((block, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (block.type) {
      case "heading": {
        const Tag = `h${block.level}` as "h1";
        return (
          <Tag key={key} className={HEADING_CLASSES[block.level]}>
            {renderInline(block.text, key)}
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={key} className="my-3 leading-7">
            {renderInline(block.text, key)}
          </p>
        );
      case "code":
        return (
          <pre
            key={key}
            className="my-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm print:whitespace-pre-wrap"
          >
            <code>{block.code}</code>
          </pre>
        );
      case "hr":
        return <hr key={key} className="my-8" />;
      case "blockquote":
        return (
          <blockquote
            key={key}
            className="my-4 border-l-4 border-primary/30 pl-4 text-muted-foreground italic"
          >
            {renderBlocks(block.children, key)}
          </blockquote>
        );
      case "table":
        return (
          <div key={key} className="my-4 w-full overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {block.header.map((cell, c) => (
                    <th
                      key={c}
                      className="border-b px-3 py-2 text-left font-semibold"
                      style={{ textAlign: block.align[c] ?? undefined }}
                    >
                      {renderInline(cell, `${key}-h${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-b last:border-b-0 even:bg-muted/20">
                    {block.header.map((_, c) => (
                      <td
                        key={c}
                        className="px-3 py-2 align-top"
                        style={{ textAlign: block.align[c] ?? undefined }}
                      >
                        {renderInline(row[c] ?? "", `${key}-${r}-${c}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "list": {
        const isTaskList = block.items.every((item) => item.checked !== null);
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <Tag
            key={key}
            start={block.ordered && block.start !== 1 ? block.start : undefined}
            className={cn(
              "my-3 space-y-1.5 [&_ol]:my-1.5 [&_ul]:my-1.5",
              isTaskList ? "list-none pl-1" : block.ordered ? "list-decimal pl-6" : "list-disc pl-6",
            )}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="leading-7 marker:text-muted-foreground">
                {item.checked !== null ? (
                  <span className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={item.checked}
                      className="mt-1.5 size-4 shrink-0 accent-primary"
                      aria-label="Tandai selesai"
                    />
                    <span>{renderInline(item.text, `${key}-${itemIndex}`)}</span>
                  </span>
                ) : (
                  renderInline(item.text, `${key}-${itemIndex}`)
                )}
                {item.children.length > 0 && renderBlocks(item.children, `${key}-${itemIndex}`)}
              </li>
            ))}
          </Tag>
        );
      }
    }
  });
}

export function MarkdownView({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-sm text-foreground/90 sm:text-base", className)}>
      {renderBlocks(parseMarkdown(content))}
    </div>
  );
}
