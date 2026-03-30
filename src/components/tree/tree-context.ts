import { createContext, useContext } from "react";

interface TreeContextValue {
  onExtend?: (nodeId: string) => Promise<void>;
}

export const TreeContext = createContext<TreeContextValue>({});

export function useTreeContext() {
  return useContext(TreeContext);
}
