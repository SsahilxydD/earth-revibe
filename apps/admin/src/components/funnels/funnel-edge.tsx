'use client';

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

type FunnelEdgeData = {
  conversionRate?: number;
  userCount?: number;
};

const dashAnimationStyles = `
@keyframes dash-flow {
  to {
    stroke-dashoffset: -20;
  }
}
`;

function FunnelEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as FunnelEdgeData | undefined;
  const conversionRate =
    edgeData?.conversionRate != null ? `${edgeData.conversionRate}%` : '\u2014';
  const userCount = edgeData?.userCount;

  return (
    <>
      <style>{dashAnimationStyles}</style>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
          strokeWidth: 2,
          strokeDasharray: '6 4',
          animation: 'dash-flow 0.6s linear infinite',
          transition: 'stroke 0.2s ease',
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <div className="flex flex-col items-center bg-[#1a1a2e] border border-white/20 rounded-full px-3 py-1">
            <span className="text-xs font-medium text-white leading-tight">{conversionRate}</span>
            {userCount != null && (
              <span className="text-[10px] text-white/50 leading-tight">
                {userCount.toLocaleString()} users
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const FunnelEdge = memo(FunnelEdgeComponent);
export default FunnelEdge;
