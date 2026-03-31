'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';

// ── Types ──────────────────────────────────────────────────────────────────

export type FunnelStepType =
  | 'trigger'
  | 'page_visit'
  | 'view_item'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'remove_from_cart'
  | 'search'
  | 'custom_event';

export interface FunnelNodeData extends Record<string, unknown> {
  type: FunnelStepType;
  label: string;
  eventName: string;
  description?: string;
  icon?: string;
  userCount?: number;
  conversionRate?: number;
  dropOff?: number;
  filters?: Record<string, string>;
  color?: string;
}

export interface SavedFunnel {
  id: string;
  name: string;
  description?: string;
  nodes: Node<FunnelNodeData>[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
  totalEntries?: number;
  overallConversion?: number;
}

// ── Step templates ─────────────────────────────────────────────────────────

export const STEP_TEMPLATES: Record<
  FunnelStepType,
  { label: string; eventName: string; description: string; color: string }
> = {
  trigger: {
    label: 'Entry Point',
    eventName: 'session_start',
    description: 'Visitor enters the funnel',
    color: '#6366f1',
  },
  page_visit: {
    label: 'Page Visit',
    eventName: '$pageview',
    description: 'Visits a specific page',
    color: '#8b5cf6',
  },
  view_item: {
    label: 'View Item',
    eventName: 'view_item',
    description: 'Views a product page',
    color: '#3b82f6',
  },
  add_to_cart: {
    label: 'Add to Cart',
    eventName: 'add_to_cart',
    description: 'Adds item to cart',
    color: '#f59e0b',
  },
  begin_checkout: {
    label: 'Begin Checkout',
    eventName: 'begin_checkout',
    description: 'Starts checkout process',
    color: '#f97316',
  },
  purchase: {
    label: 'Purchase',
    eventName: 'purchase',
    description: 'Completes a purchase',
    color: '#22c55e',
  },
  remove_from_cart: {
    label: 'Remove from Cart',
    eventName: 'remove_from_cart',
    description: 'Removes item from cart',
    color: '#ef4444',
  },
  search: {
    label: 'Search',
    eventName: 'search',
    description: 'Performs a search',
    color: '#06b6d4',
  },
  custom_event: {
    label: 'Custom Event',
    eventName: 'custom',
    description: 'A custom tracked event',
    color: '#a855f7',
  },
};

// ── Store ──────────────────────────────────────────────────────────────────

interface FunnelState {
  funnels: SavedFunnel[];
  activeFunnelId: string | null;
  nodes: Node<FunnelNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  isEditMode: boolean;
  dateRange: { from: string; to: string };

  // Funnel CRUD
  createFunnel: (name: string, description?: string) => string;
  deleteFunnel: (id: string) => void;
  loadFunnel: (id: string) => void;
  saveFunnel: () => void;
  renameFunnel: (id: string, name: string) => void;

  // Canvas operations
  setNodes: (nodes: Node<FunnelNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (type: FunnelStepType, position?: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<FunnelNodeData>) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;

  // UI
  setSelectedNodeId: (id: string | null) => void;
  setIsEditMode: (mode: boolean) => void;
  setDateRange: (range: { from: string; to: string }) => void;

  // Analytics data
  updateNodeAnalytics: (
    analytics: Record<string, { userCount: number; conversionRate: number; dropOff: number }>
  ) => void;
}

let nodeCounter = 0;

function generateId() {
  return `node_${Date.now()}_${++nodeCounter}`;
}

const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

export const useFunnelStore = create<FunnelState>()(
  persist(
    (set, get) => ({
      funnels: [],
      activeFunnelId: null,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isEditMode: true,
      dateRange: {
        from: thirtyDaysAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      },

      createFunnel: (name, description) => {
        const id = `funnel_${Date.now()}`;
        const now = new Date().toISOString();
        const triggerNode: Node<FunnelNodeData> = {
          id: generateId(),
          type: 'funnelNode',
          position: { x: 100, y: 200 },
          data: {
            type: 'trigger',
            label: 'Entry Point',
            eventName: 'session_start',
            description: 'Visitor enters the funnel',
            color: '#6366f1',
            userCount: 0,
            conversionRate: 100,
            dropOff: 0,
          },
        };

        const newFunnel: SavedFunnel = {
          id,
          name,
          description,
          nodes: [triggerNode],
          edges: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          funnels: [...state.funnels, newFunnel],
          activeFunnelId: id,
          nodes: [triggerNode],
          edges: [],
          selectedNodeId: null,
        }));

        return id;
      },

      deleteFunnel: (id) => {
        set((state) => ({
          funnels: state.funnels.filter((f) => f.id !== id),
          ...(state.activeFunnelId === id
            ? { activeFunnelId: null, nodes: [], edges: [], selectedNodeId: null }
            : {}),
        }));
      },

      loadFunnel: (id) => {
        const funnel = get().funnels.find((f) => f.id === id);
        if (!funnel) return;
        set({
          activeFunnelId: id,
          nodes: funnel.nodes,
          edges: funnel.edges,
          selectedNodeId: null,
        });
      },

      saveFunnel: () => {
        const { activeFunnelId, nodes, edges, funnels } = get();
        if (!activeFunnelId) return;

        set({
          funnels: funnels.map((f) =>
            f.id === activeFunnelId
              ? { ...f, nodes, edges, updatedAt: new Date().toISOString() }
              : f
          ),
        });
      },

      renameFunnel: (id, name) => {
        set((state) => ({
          funnels: state.funnels.map((f) => (f.id === id ? { ...f, name } : f)),
        }));
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),

      addNode: (type, position) => {
        const template = STEP_TEMPLATES[type];
        const existingNodes = get().nodes;
        const pos = position || {
          x: Math.max(0, ...existingNodes.map((n) => n.position.x)) + 300,
          y: 200,
        };

        const newNode: Node<FunnelNodeData> = {
          id: generateId(),
          type: 'funnelNode',
          position: pos,
          data: {
            type,
            label: template.label,
            eventName: template.eventName,
            description: template.description,
            color: template.color,
            userCount: 0,
            conversionRate: 0,
            dropOff: 0,
          },
        };

        set((state) => ({ nodes: [...state.nodes, newNode] }));
      },

      removeNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        }));
      },

      updateNodeData: (id, data) => {
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
        }));
      },

      addEdge: (edge) => {
        set((state) => ({ edges: [...state.edges, edge] }));
      },

      removeEdge: (id) => {
        set((state) => ({ edges: state.edges.filter((e) => e.id !== id) }));
      },

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setIsEditMode: (mode) => set({ isEditMode: mode }),
      setDateRange: (range) => set({ dateRange: range }),

      updateNodeAnalytics: (analytics) => {
        set((state) => ({
          nodes: state.nodes.map((n) => {
            const data = analytics[n.data.eventName];
            if (!data) return n;
            return {
              ...n,
              data: {
                ...n.data,
                userCount: data.userCount,
                conversionRate: data.conversionRate,
                dropOff: data.dropOff,
              },
            };
          }),
        }));
      },
    }),
    {
      name: 'earth-revibe-funnels',
      partialize: (state) => ({
        funnels: state.funnels,
        dateRange: state.dateRange,
      }),
    }
  )
);
