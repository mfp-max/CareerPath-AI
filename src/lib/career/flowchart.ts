import {
  NODE_TYPES,
  type FlowchartData,
  type FlowEdge,
  type FlowNode,
  type FlowNodeType,
} from "./types";

/**
 * Coerces unknown JSON (AI output or a JSONB column) into a valid flowchart:
 * unique string ids, known node types, and edges that only reference existing nodes.
 */
export function normalizeFlowchart(raw: unknown): FlowchartData {
  const data = (raw ?? {}) as { nodes?: unknown; edges?: unknown };
  const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
  const rawEdges = Array.isArray(data.edges) ? data.edges : [];

  const nodes: FlowNode[] = [];
  const seen = new Set<string>();
  rawNodes.forEach((n, i) => {
    if (!n || typeof n !== "object") return;
    const node = n as Record<string, unknown>;
    let id = String(node.id ?? i + 1);
    while (seen.has(id)) id = `${id}_`;
    seen.add(id);
    const type = NODE_TYPES.includes(node.type as FlowNodeType)
      ? (node.type as FlowNodeType)
      : "step";
    nodes.push({
      id,
      label: String(node.label ?? `Tahap ${i + 1}`),
      type,
      description: node.description ? String(node.description) : undefined,
      duration: node.duration ? String(node.duration) : undefined,
    });
  });

  // Models sometimes reference nodes by label, by 1-based position, or with a
  // different id format ("n1" vs "1"); resolve those before dropping an edge.
  const resolveRef = (ref: unknown): string | undefined => {
    const value = String(ref ?? "").trim();
    if (seen.has(value)) return value;
    const byLabel = nodes.find((n) => n.label.toLowerCase() === value.toLowerCase());
    if (byLabel) return byLabel.id;
    const digits = value.match(/\d+/)?.[0];
    if (digits) {
      if (seen.has(digits)) return digits;
      return nodes[Number(digits) - 1]?.id;
    }
    return undefined;
  };

  const edges: FlowEdge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (source: string | undefined, target: string | undefined) => {
    if (!source || !target || source === target) return;
    const key = `${source}->${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target });
  };
  rawEdges
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .forEach((e) => addEdge(resolveRef(e.source), resolveRef(e.target)));

  // Keep the path connected: link any stage left without an incoming edge (other than
  // the first) or an outgoing edge (other than the last) to its neighbour in list order.
  const hasIncoming = new Set(edges.map((e) => e.target));
  const hasOutgoing = new Set(edges.map((e) => e.source));
  nodes.forEach((node, i) => {
    if (i > 0 && !hasIncoming.has(node.id)) addEdge(nodes[i - 1].id, node.id);
    if (i < nodes.length - 1 && !hasOutgoing.has(node.id)) addEdge(node.id, nodes[i + 1].id);
  });

  return { nodes, edges };
}

export interface LayoutNode extends FlowNode {
  x: number;
  y: number;
  lines: string[];
}

export interface FlowLayout {
  nodes: LayoutNode[];
  width: number;
  height: number;
}

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 76;
const GAP_X = 36;
const GAP_Y = 64;
const PADDING = 24;
const CHARS_PER_LINE = 26;
const MAX_LINES = 2;

export function wrapLabel(label: string): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > CHARS_PER_LINE && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length > MAX_LINES) {
    const kept = lines.slice(0, MAX_LINES);
    kept[MAX_LINES - 1] = `${kept[MAX_LINES - 1].slice(0, CHARS_PER_LINE - 1)}…`;
    return kept;
  }
  return lines.map((l) => (l.length > CHARS_PER_LINE ? `${l.slice(0, CHARS_PER_LINE - 1)}…` : l));
}

/**
 * Layered top-to-bottom layout: each node's level is its longest distance from a
 * root; nodes within a level are ordered by the average position of their parents.
 */
export function layoutFlowchart({ nodes, edges }: FlowchartData): FlowLayout {
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  nodes.forEach((n) => {
    parents.set(n.id, []);
    children.set(n.id, []);
    indegree.set(n.id, 0);
  });
  edges.forEach((e) => {
    children.get(e.source)!.push(e.target);
    parents.get(e.target)!.push(e.source);
    indegree.set(e.target, indegree.get(e.target)! + 1);
  });

  // Kahn's algorithm for longest-path levels; nodes stuck in cycles go last.
  const level = new Map<string, number>();
  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  queue.forEach((id) => level.set(id, 0));
  const remaining = new Map(indegree);
  while (queue.length) {
    const id = queue.shift()!;
    for (const child of children.get(id)!) {
      level.set(child, Math.max(level.get(child) ?? 0, level.get(id)! + 1));
      remaining.set(child, remaining.get(child)! - 1);
      if (remaining.get(child) === 0) queue.push(child);
    }
  }
  let maxLevel = Math.max(0, ...Array.from(level.values()));
  nodes.forEach((n) => {
    if (remaining.get(n.id)! > 0) level.set(n.id, ++maxLevel);
  });

  const rows: string[][] = [];
  nodes.forEach((n) => {
    const l = level.get(n.id)!;
    (rows[l] ??= []).push(n.id);
  });

  const order = new Map<string, number>();
  rows.forEach((row, l) => {
    if (l > 0) {
      const score = (id: string) => {
        const ps = parents.get(id)!.filter((p) => order.has(p));
        return ps.length ? ps.reduce((s, p) => s + order.get(p)!, 0) / ps.length : Number.MAX_SAFE_INTEGER;
      };
      row.sort((a, b) => score(a) - score(b));
    }
    row.forEach((id, i) => order.set(id, i - (row.length - 1) / 2));
  });

  const denseRows = rows.filter(Boolean);
  const maxCols = Math.max(1, ...denseRows.map((r) => r.length));
  const width = maxCols * NODE_WIDTH + (maxCols - 1) * GAP_X + PADDING * 2;
  const height =
    denseRows.length * NODE_HEIGHT + Math.max(0, denseRows.length - 1) * GAP_Y + PADDING * 2;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const laidOut: LayoutNode[] = [];
  denseRows.forEach((row, rowIndex) => {
    const rowWidth = row.length * NODE_WIDTH + (row.length - 1) * GAP_X;
    const startX = (width - rowWidth) / 2;
    row.forEach((id, i) => {
      const node = byId.get(id)!;
      laidOut.push({
        ...node,
        x: startX + i * (NODE_WIDTH + GAP_X),
        y: PADDING + rowIndex * (NODE_HEIGHT + GAP_Y),
        lines: wrapLabel(node.label),
      });
    });
  });

  return { nodes: laidOut, width, height };
}

/** Mermaid representation, used when exporting the plan to Markdown. */
export function toMermaid({ nodes, edges }: FlowchartData): string {
  const safeId = (id: string) => `n${id.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  const escape = (s: string) => s.replace(/"/g, "'");
  const shape = (n: FlowNode) => {
    const label = `"${escape(n.label)}"`;
    if (n.type === "start") return `([${label}])`;
    if (n.type === "milestone") return `{{${label}}}`;
    if (n.type === "goal") return `[[${label}]]`;
    return `[${label}]`;
  };
  const lines = ["flowchart TD"];
  nodes.forEach((n) => lines.push(`  ${safeId(n.id)}${shape(n)}`));
  edges.forEach((e) => lines.push(`  ${safeId(e.source)} --> ${safeId(e.target)}`));
  return lines.join("\n");
}
