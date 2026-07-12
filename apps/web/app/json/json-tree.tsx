import { JsonTreeNode } from "./json-tree-node";
import type { JsonValue } from "./types";

interface JsonTreeProps {
  collapseLabel: string;
  defaultExpanded: boolean;
  expandLabel: string;
  value: JsonValue;
}

export function JsonTree({ collapseLabel, defaultExpanded, expandLabel, value }: JsonTreeProps) {
  return (
    <div className="min-w-max font-mono">
      <JsonTreeNode
        collapseLabel={collapseLabel}
        defaultExpanded={defaultExpanded}
        expandLabel={expandLabel}
        value={value}
      />
    </div>
  );
}
