'use client';

import { useQuery } from '@tanstack/react-query';
import { useFunnelStore } from '@/stores/funnel-store';

interface StepAnalytics {
  eventName: string;
  userCount: number;
  conversionRate: number;
  dropOff: number;
}

interface FunnelAnalyticsData {
  steps: StepAnalytics[];
  totalEntries: number;
  totalCompletions: number;
  overallConversion: number;
  biggestDropOff: { step: string; percentage: number } | null;
}

/**
 * Fetches analytics data for the active funnel.
 *
 * In production, this would call PostHog's Query API or Trends endpoint.
 * For now, it generates realistic mock data based on funnel structure
 * so the UI is fully functional before PostHog API integration.
 */
export function useFunnelAnalytics(enabled = true) {
  const nodes = useFunnelStore((s) => s.nodes);
  const edges = useFunnelStore((s) => s.edges);
  const dateRange = useFunnelStore((s) => s.dateRange);
  const updateNodeAnalytics = useFunnelStore((s) => s.updateNodeAnalytics);

  return useQuery<FunnelAnalyticsData>({
    queryKey: ['funnel-analytics', nodes.map((n) => n.data.eventName), dateRange],
    queryFn: async () => {
      // TODO: Replace with real PostHog API call:
      // const response = await fetch(`${POSTHOG_HOST}/api/projects/${PROJECT_ID}/insights/funnel`, {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${POSTHOG_API_KEY}` },
      //   body: JSON.stringify({
      //     events: orderedNodes.map(n => ({ id: n.data.eventName, type: 'events' })),
      //     date_from: dateRange.from,
      //     date_to: dateRange.to,
      //   }),
      // });

      // Generate realistic mock data based on funnel structure
      // Walk edges to determine step order from trigger node
      const orderedNodes = getOrderedNodes(nodes, edges);

      if (orderedNodes.length === 0) {
        return {
          steps: [],
          totalEntries: 0,
          totalCompletions: 0,
          overallConversion: 0,
          biggestDropOff: null,
        };
      }

      // Simulate realistic drop-off at each step
      const baseVisitors = 800 + Math.floor(Math.random() * 400);
      const dropOffRates: Record<string, number> = {
        session_start: 0,
        $pageview: 0.15,
        view_item: 0.4,
        add_to_cart: 0.55,
        begin_checkout: 0.35,
        purchase: 0.3,
        remove_from_cart: 0.1,
        search: 0.2,
        custom: 0.25,
      };

      let currentUsers = baseVisitors;
      const steps: StepAnalytics[] = [];
      let biggestDropOff: { step: string; percentage: number } | null = null;

      const analyticsMap: Record<
        string,
        { userCount: number; conversionRate: number; dropOff: number }
      > = {};

      for (let i = 0; i < orderedNodes.length; i++) {
        const node = orderedNodes[i];
        const eventName = node.data.eventName;
        const dropRate = dropOffRates[eventName] ?? 0.3;

        if (i > 0) {
          const dropped = Math.floor(currentUsers * dropRate);
          currentUsers = Math.max(1, currentUsers - dropped);
        }

        const conversionRate = i === 0 ? 100 : (currentUsers / baseVisitors) * 100;
        const dropOff = i === 0 ? 0 : dropRate * 100;

        steps.push({
          eventName,
          userCount: currentUsers,
          conversionRate: Math.round(conversionRate * 10) / 10,
          dropOff: Math.round(dropOff * 10) / 10,
        });

        analyticsMap[eventName] = {
          userCount: currentUsers,
          conversionRate: Math.round(conversionRate * 10) / 10,
          dropOff: Math.round(dropOff * 10) / 10,
        };

        if (i > 0 && (!biggestDropOff || dropOff > biggestDropOff.percentage)) {
          biggestDropOff = { step: node.data.label, percentage: Math.round(dropOff * 10) / 10 };
        }
      }

      // Update store nodes with analytics data
      updateNodeAnalytics(analyticsMap);

      const totalEntries = steps[0]?.userCount ?? 0;
      const totalCompletions = steps[steps.length - 1]?.userCount ?? 0;

      return {
        steps,
        totalEntries,
        totalCompletions,
        overallConversion:
          totalEntries > 0 ? Math.round((totalCompletions / totalEntries) * 1000) / 10 : 0,
        biggestDropOff,
      };
    },
    enabled: enabled && nodes.length > 0,
    refetchInterval: 60_000, // Poll every 60s in live mode
    staleTime: 30_000,
  });
}

/**
 * Walk edges from trigger node to determine step order.
 */
function getOrderedNodes(
  nodes: ReturnType<typeof useFunnelStore.getState>['nodes'],
  edges: ReturnType<typeof useFunnelStore.getState>['edges']
) {
  // Find trigger node (entry point)
  const triggerNode = nodes.find((n) => n.data.type === 'trigger');
  if (!triggerNode) return nodes; // fallback: return all nodes

  const ordered: typeof nodes = [triggerNode];
  const visited = new Set([triggerNode.id]);
  let currentId = triggerNode.id;

  // BFS through edges
  while (true) {
    const nextEdge = edges.find((e) => e.source === currentId && !visited.has(e.target));
    if (!nextEdge) break;

    const nextNode = nodes.find((n) => n.id === nextEdge.target);
    if (!nextNode) break;

    ordered.push(nextNode);
    visited.add(nextNode.id);
    currentId = nextNode.id;
  }

  // Add any unconnected nodes at the end
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      ordered.push(node);
    }
  }

  return ordered;
}
