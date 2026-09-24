'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';

interface GraphCanvasProps {
  elements: { nodes: any[]; edges: any[] };
  onNodeClick?: (node: any) => void;
}

export default function GraphCanvas({ elements, onNodeClick }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onClickRef = useRef(onNodeClick);
  onClickRef.current = onNodeClick;

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: stylesheet as any,
      minZoom: 0.1,
      maxZoom: 3,
      boxSelectionEnabled: true,
    });

    cy.on('tap', 'node', (event) => {
      onClickRef.current?.(event.target);
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const next: ElementDefinition[] = [
      ...(elements.nodes || []),
      ...(elements.edges || []),
    ];

    cy.elements().remove();
    if (next.length > 0) {
      cy.add(next);
      cy.layout({ name: 'cose', animate: false, padding: 40 }).run();
    }
  }, [elements]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-4 right-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 text-xs pointer-events-none">
        <div className="text-gray-400 font-semibold mb-2">LEGEND</div>
        <LegendItem color="#3b82f6" shape="square" label="Bank Account" />
        <LegendItem color="#f59e0b" shape="circle" label="Person" />
        <LegendItem color="#8b5cf6" shape="diamond" label="Device" />
        <LegendItem color="#ef4444" shape="hexagon" label="IP" />
      </div>
    </div>
  );
}

const stylesheet = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'font-size': '10px',
      'font-family': 'monospace',
      'text-valign': 'bottom',
      color: '#e5e7eb',
      'background-color': '#374151',
      'border-width': 2,
      'border-color': '#1f2937',
      width: 24,
      height: 24,
    },
  },
  { selector: 'node.account', style: { 'background-color': '#3b82f6', shape: 'rectangle' } },
  { selector: 'node.person', style: { 'background-color': '#f59e0b', shape: 'ellipse' } },
  { selector: 'node.device', style: { 'background-color': '#8b5cf6', shape: 'diamond' } },
  { selector: 'node.ip', style: { 'background-color': '#ef4444', shape: 'hexagon' } },
  {
    selector: 'node.ringleader',
    style: {
      'background-color': '#ef4444',
      'border-color': '#fff',
      'border-width': 4,
      width: 50,
      height: 50,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#4b5563',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#4b5563',
      'curve-style': 'bezier',
    },
  },
  { selector: 'edge.transfer', style: { 'line-color': '#3b82f6', 'target-arrow-color': '#3b82f6' } },
];

function LegendItem({ color, shape, label }: { color: string; shape: string; label: string }) {
  const shapeStyles: Record<string, React.CSSProperties> = {
    square: { width: 12, height: 12, borderRadius: 2 },
    circle: { width: 12, height: 12, borderRadius: '50%' },
    diamond: { width: 12, height: 12, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
    hexagon: { width: 12, height: 12, clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
  };
  return (
    <div className="flex items-center gap-2">
      <div style={{ backgroundColor: color, ...shapeStyles[shape] }} />
      <span className="text-gray-300">{label}</span>
    </div>
  );
}
