"use client";

import { useState, useCallback } from "react";
import type { FutureTreeNode, FutureTreeEdge, SimulationTree, UserProfile } from "@/lib/ai/types";

interface OracleState {
  nodes: FutureTreeNode[];
  edges: FutureTreeEdge[];
  simulationId: string | null;
  generating: boolean;
  extending: Set<string>;
  error: string | null;
}

interface SimulateOptions {
  decision: string;
  profile: UserProfile;
  apiKey: string;
  provider?: "claude" | "openai" | "custom";
  model?: string;
}

interface ExtendOptions {
  nodeId: string;
  profile: UserProfile;
  apiKey: string;
  provider?: "claude" | "openai" | "custom";
}

export function useOracle() {
  const [state, setState] = useState<OracleState>({
    nodes: [],
    edges: [],
    simulationId: null,
    generating: false,
    extending: new Set(),
    error: null,
  });

  const simulate = useCallback(async (options: SimulateOptions) => {
    setState((s) => ({ ...s, generating: true, error: null }));

    try {
      const response = await fetch("/api/oracle/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const data: { simulationId: string; tree: SimulationTree } = await response.json();

      setState((s) => ({
        ...s,
        nodes: data.tree.nodes,
        edges: data.tree.edges,
        simulationId: data.simulationId,
        generating: false,
      }));

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Simulation failed";
      setState((s) => ({ ...s, generating: false, error: message }));
      throw err;
    }
  }, []);

  const extendNode = useCallback(
    async (options: ExtendOptions) => {
      if (!state.simulationId) throw new Error("No active simulation");

      setState((s) => ({
        ...s,
        extending: new Set([...s.extending, options.nodeId]),
        error: null,
      }));

      try {
        const response = await fetch("/api/oracle/extend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...options,
            simulationId: state.simulationId,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error ?? `HTTP ${response.status}`);
        }

        const data: { nodes: FutureTreeNode[]; edges: FutureTreeEdge[] } =
          await response.json();

        setState((s) => {
          const extending = new Set(s.extending);
          extending.delete(options.nodeId);
          return {
            ...s,
            nodes: [...s.nodes, ...data.nodes],
            edges: [...s.edges, ...data.edges],
            extending,
          };
        });

        return data;
      } catch (err) {
        setState((s) => {
          const extending = new Set(s.extending);
          extending.delete(options.nodeId);
          return {
            ...s,
            extending,
            error: err instanceof Error ? err.message : "Extension failed",
          };
        });
        throw err;
      }
    },
    [state.simulationId]
  );

  const reset = useCallback(() => {
    setState({
      nodes: [],
      edges: [],
      simulationId: null,
      generating: false,
      extending: new Set(),
      error: null,
    });
  }, []);

  return {
    ...state,
    simulate,
    extendNode,
    reset,
  };
}
