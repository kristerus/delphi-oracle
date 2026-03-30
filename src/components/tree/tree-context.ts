import { createContext, useContext } from "react";
import type { Granularity } from "@/lib/ai/types";

interface TreeContextValue {
  onExtend?: (nodeId: string, depth?: number, granularity?: Granularity) => Promise<void>;
}

export const TreeContext = createContext<TreeContextValue>({});

export function useTreeContext() {
  return useContext(TreeContext);
}
