"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

const BranchEdge = memo(function BranchEdge({
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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
    offset: 32,
  });

  const probability = (data?.probability as number) ?? 1;

  const strokeColor = selected
    ? "oklch(82% 0.165 80)"
    : probability >= 0.5
    ? "oklch(72% 0.175 76 / 0.7)"
    : probability >= 0.25
    ? "oklch(68% 0.115 276 / 0.6)"
    : "oklch(55% 0.160 22 / 0.5)";

  const strokeWidth = selected ? 2.5 : 1.5;

  return (
    <>
      {/* Glow layer */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: strokeColor.replace("/ 0.", "/ 0.15"),
          strokeWidth: strokeWidth + 6,
          fill: "none",
          filter: "blur(4px)",
        }}
      />
      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          fill: "none",
          strokeDasharray: "none",
        }}
      />
      {/* Animated flow dots */}
      <circle r="3" fill={strokeColor}>
        <animateMotion
          dur={`${3 + Math.random() * 2}s`}
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>
    </>
  );
});

export default BranchEdge;
