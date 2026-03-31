'use client';

import { useQuery } from '@tanstack/react-query';
import { useFunnelStore } from '@/stores/funnel-store';

interface StepAnalytics {
  eventName: string;
  userCount: number;
  conversionRate: number;
  dropOff: number;
}

export interface FunnelAnalyticsData {
  steps: StepAnalytics[];
  totalEntries: number;
  totalCompletions: number;
  overallConversion: number;
  biggestDropOff: { step: string; percentage: number } | null;
  isMockData: boolean;
}

/**
 * Fetches real analytics data from PostHog via server-side API route.
 * Falls back to consistent mock data if POSTHOG_PERSONAL_API_KEY is not configured.
 *
 * @param livePolling - When true, auto-refreshes every 60s (Live Data mode)
 */
export function useFunnelAnalytics(livePolling = false) {
  const nodes = useFunnelStore((s) => s.nodes);
  const edges = useFunnelStore((s) => s.edges);
  const dateRange = useFunnelStore((s) => s.dateRange);
  const updateNodeAnalytics = useFunnelStore((s) => s.updateNodeAnalytics);

  return useQuery<FunnelAnalyticsData>({
    queryKey: ['funnel-analytics', nodes.map((n) => n.data.eventName), dateRange],
    queryFn: async () => {
      const orderedNodes = getOrderedNodes(nodes, edges);

      if (orderedNodes.length === 0) {
        return {
          steps: [],
          totalEntries: 0,
          totalCompletions: 0,
          overallConversion: 0,
          biggestDropOff: null,
          isMockData: false,
        };
      }

      const eventNames = orderedNodes.map((n) => n.data.eventName);

      // Call our server-side API route which proxies to PostHog
      let eventCounts: Record<string, number>;
      let isMockData = false;

      try {
        const res = await fetch('/api/posthog/funnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: eventNames,
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
          }),
        });

        const data = await res.json();
        eventCounts = data.results ?? {};
        isMockData = data.mock === true;
      } catch {
        // Network error — use empty counts
        eventCounts = {};
        isMockData = true;
      }

      // Build step analytics from the ordered nodes + PostHog counts
      const steps: StepAnalytics[] = [];
      let biggestDropOff: { step: string; percentage: number } | null = null;
      const analyticsMap: Record<
        string,
        { userCount: number; conversionRate: number; dropOff: number }
      > = {};

      const firstStepCount = eventCounts[orderedNodes[0].data.eventName] ?? 0;

      for (let i = 0; i < orderedNodes.length; i++) {
        const node = orderedNodes[i];
        const eventName = node.data.eventName;
        const userCount = eventCounts[eventName] ?? 0;

        const prevCount = i > 0 ? (eventCounts[orderedNodes[i - 1].data.eventName] ?? 0) : 0;
        const conversionRate =
          firstStepCount > 0 ? (userCount / firstStepCount) * 100 : i === 0 ? 100 : 0;
        const dropOff = i > 0 && prevCount > 0 ? ((prevCount - userCount) / prevCount) * 100 : 0;

        const stepData: StepAnalytics = {
          eventName,
          userCount,
          conversionRate: Math.round(conversionRate * 10) / 10,
          dropOff: Math.round(dropOff * 10) / 10,
        };

        steps.push(stepData);

        analyticsMap[eventName] = {
          userCount,
          conversionRate: stepData.conversionRate,
          dropOff: stepData.dropOff,
        };

        if (i > 0 && (!biggestDropOff || stepData.dropOff > biggestDropOff.percentage)) {
          biggestDropOff = {
            step: node.data.label,
            percentage: stepData.dropOff,
          };
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
        isMockData,
      };
    },
    enabled: nodes.length > 0,
    refetchInterval: livePolling ? 60_000 : false,
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
  const triggerNode = nodes.find((n) => n.data.type === 'trigger');
  if (!triggerNode) return nodes;

  const ordered: typeof nodes = [triggerNode];
  const visited = new Set([triggerNode.id]);
  let currentId = triggerNode.id;

  while (true) {
    const nextEdge = edges.find((e) => e.source === currentId && !visited.has(e.target));
    if (!nextEdge) break;

    const nextNode = nodes.find((n) => n.id === nextEdge.target);
    if (!nextNode) break;

    ordered.push(nextNode);
    visited.add(nextNode.id);
    currentId = nextNode.id;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      ordered.push(node);
    }
  }

  return ordered;
}
