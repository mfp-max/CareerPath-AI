"use client";

import { useId, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Clock, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  layoutFlowchart,
  NODE_HEIGHT,
  NODE_WIDTH,
  type LayoutNode,
} from "@/lib/career/flowchart";
import type { FlowchartData, FlowNodeType } from "@/lib/career/types";

const TYPE_STYLES: Record<
  FlowNodeType,
  { label: string; box: string; caption: string; text: string; legend: string }
> = {
  start: {
    label: "Mulai",
    box: "fill-emerald-50 stroke-emerald-500 dark:fill-emerald-500/15",
    caption: "fill-emerald-700 dark:fill-emerald-400",
    text: "fill-foreground",
    legend: "bg-emerald-500",
  },
  step: {
    label: "Tahap",
    box: "fill-card stroke-border",
    caption: "fill-muted-foreground",
    text: "fill-foreground",
    legend: "bg-muted-foreground/60",
  },
  milestone: {
    label: "Milestone",
    box: "fill-amber-50 stroke-amber-500 dark:fill-amber-500/15",
    caption: "fill-amber-700 dark:fill-amber-400",
    text: "fill-foreground",
    legend: "bg-amber-500",
  },
  goal: {
    label: "Target",
    box: "fill-primary stroke-primary",
    caption: "fill-primary-foreground/70",
    text: "fill-primary-foreground",
    legend: "bg-primary",
  },
};

const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.2, 1.4];

export function FlowchartView({ data }: { data: FlowchartData }) {
  const layout = useMemo(() => layoutFlowchart(data), [data]);
  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const markerId = `arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const [zoomIndex, setZoomIndex] = useState(3);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(
    () => (data.nodes.find((n) => n.type === "start") ?? data.nodes[0])?.id ?? null,
  );

  if (layout.nodes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Flowchart tidak tersedia untuk roadmap ini.
      </p>
    );
  }

  const scale = ZOOM_STEPS[zoomIndex];
  const focus = hovered ?? selected;
  const selectedNode = selected ? byId.get(selected) : undefined;
  const prevNodes = data.edges.filter((e) => e.target === selected).map((e) => byId.get(e.source)!);
  const nextNodes = data.edges.filter((e) => e.source === selected).map((e) => byId.get(e.target)!);

  const typesInUse = Array.from(new Set(layout.nodes.map((n) => n.type)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {typesInUse.map((type) => (
            <span key={type} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", TYPE_STYLES[type].legend)} />
              {TYPE_STYLES[type].label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
            disabled={zoomIndex === 0}
            aria-label="Perkecil"
          >
            <ZoomOut />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setZoomIndex((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            aria-label="Perbesar"
          >
            <ZoomIn />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setZoomIndex(3)}
            aria-label="Reset zoom"
          >
            <Maximize2 />
          </Button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/30 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px] print:max-h-none print:overflow-visible print:border-0 print:bg-none">
        <svg
          role="img"
          aria-label="Flowchart jalur karir"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width * scale}
          height={layout.height * scale}
          className="mx-auto block print:h-auto! print:w-full! print:max-w-full"
        >
          <defs>
            {["idle", "active"].map((state) => (
              <marker
                key={state}
                id={`${markerId}-${state}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  className={state === "active" ? "fill-primary" : "fill-muted-foreground/50"}
                />
              </marker>
            ))}
          </defs>

          {data.edges.map((edge) => {
            const source = byId.get(edge.source);
            const target = byId.get(edge.target);
            if (!source || !target) return null;
            const active = focus === edge.source || focus === edge.target;
            return (
              <path
                key={`${edge.source}-${edge.target}`}
                d={edgePath(source, target)}
                fill="none"
                strokeWidth={active ? 2.25 : 1.5}
                className={cn(
                  "transition-colors",
                  active ? "stroke-primary" : "stroke-muted-foreground/40",
                )}
                markerEnd={`url(#${markerId}-${active ? "active" : "idle"})`}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const style = TYPE_STYLES[node.type];
            const isSelected = node.id === selected;
            const labelTop = node.lines.length === 1 ? 50 : 43;
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`${style.label}: ${node.label}`}
                aria-pressed={isSelected}
                className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-ring"
                onClick={() => setSelected(node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(node.id);
                  }
                }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={12}
                  strokeWidth={isSelected ? 3 : 1.5}
                  className={cn(style.box, "transition-[stroke-width]")}
                />
                <text
                  x={node.x + 14}
                  y={node.y + 21}
                  className={cn(style.caption, "text-[10px] font-semibold uppercase")}
                  style={{ letterSpacing: "0.06em" }}
                >
                  {style.label}
                </text>
                {node.duration && (
                  <text
                    x={node.x + NODE_WIDTH - 14}
                    y={node.y + 21}
                    textAnchor="end"
                    className={cn(style.caption, "text-[10px]")}
                  >
                    {truncate(node.duration, 16)}
                  </text>
                )}
                <text className={cn(style.text, "text-[13px] font-medium")}>
                  {node.lines.map((line, i) => (
                    <tspan key={i} x={node.x + 14} y={node.y + labelTop + i * 17}>
                      {line}
                    </tspan>
                  ))}
                </text>
                <title>{node.label}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="rounded-lg border bg-card p-4 print:hidden" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <span className={cn("size-2 rounded-full", TYPE_STYLES[selectedNode.type].legend)} />
              {TYPE_STYLES[selectedNode.type].label}
            </Badge>
            {selectedNode.duration && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="size-3" />
                {selectedNode.duration}
              </Badge>
            )}
          </div>
          <h3 className="mt-3 font-semibold">{selectedNode.label}</h3>
          {selectedNode.description && (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {selectedNode.description}
            </p>
          )}
          {(prevNodes.length > 0 || nextNodes.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {prevNodes.map((n) => (
                <Button key={`p-${n.id}`} variant="ghost" size="sm" onClick={() => setSelected(n.id)}>
                  <ArrowUp /> {truncate(n.label, 32)}
                </Button>
              ))}
              {nextNodes.map((n) => (
                <Button key={`n-${n.id}`} variant="ghost" size="sm" onClick={() => setSelected(n.id)}>
                  <ArrowDown /> {truncate(n.label, 32)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function edgePath(source: LayoutNode, target: LayoutNode): string {
  const sx = source.x + NODE_WIDTH / 2;
  const sy = source.y + NODE_HEIGHT;
  const tx = target.x + NODE_WIDTH / 2;
  const ty = target.y - 2;
  const dy = Math.max(40, Math.abs(ty - sy) / 2);
  return `M ${sx} ${sy} C ${sx} ${sy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
