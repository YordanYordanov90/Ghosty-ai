/** Canonical action `type` strings for the design agent plan (must match Zod schema). */
const CANONICAL_ACTION_TYPES = [
  "addNode",
  "moveNode",
  "resizeNode",
  "updateNodeData",
  "deleteNode",
  "addEdge",
  "deleteEdge",
] as const;

const CANONICAL_SET = new Set<string>(CANONICAL_ACTION_TYPES);

/** Lowercase / normalized-key → canonical `type`. */
const ACTION_TYPE_ALIASES: Record<string, string> = {
  addnode: "addNode",
  add_node: "addNode",
  "add-node": "addNode",
  movenode: "moveNode",
  move_node: "moveNode",
  "move-node": "moveNode",
  resizenode: "resizeNode",
  resize_node: "resizeNode",
  "resize-node": "resizeNode",
  updatenodedata: "updateNodeData",
  update_node_data: "updateNodeData",
  "update-node-data": "updateNodeData",
  update_node: "updateNodeData",
  updatenode: "updateNodeData",
  updatenode_data: "updateNodeData",
  modifynode: "updateNodeData",
  modify_node: "updateNodeData",
  editnode: "updateNodeData",
  edit_node: "updateNodeData",
  updatelabel: "updateNodeData",
  update_label: "updateNodeData",
  deletenode: "deleteNode",
  delete_node: "deleteNode",
  "delete-node": "deleteNode",
  removenode: "deleteNode",
  remove_node: "deleteNode",
  "remove-node": "deleteNode",
  addedge: "addEdge",
  add_edge: "addEdge",
  "add-edge": "addEdge",
  deleteedge: "deleteEdge",
  delete_edge: "deleteEdge",
  "delete-edge": "deleteEdge",
  removeedge: "deleteEdge",
  remove_edge: "deleteEdge",
  "remove-edge": "deleteEdge",
};

function normalizeAliasLookupKey(s: string): string {
  return s.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** "update_node_data" / "Update Node Data" → "updateNodeData" when segments match a known type. */
function segmentsToCamelCase(s: string): string | undefined {
  const parts = s
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  const camel =
    parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  return CANONICAL_SET.has(camel) ? camel : undefined;
}

function resolveActionType(raw: string): string {
  const trimmed = raw.trim();
  if (CANONICAL_SET.has(trimmed)) return trimmed;

  const pascalToCamel =
    trimmed.length > 0
      ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1).replace(/[\s_-]+/g, "")
      : trimmed;
  if (CANONICAL_SET.has(pascalToCamel)) return pascalToCamel;

  const key = normalizeAliasLookupKey(trimmed);
  const fromMap = ACTION_TYPE_ALIASES[key];
  if (fromMap && CANONICAL_SET.has(fromMap)) return fromMap;

  const fromSegments = segmentsToCamelCase(trimmed);
  if (fromSegments) return fromSegments;

  const lowerCompact = trimmed.toLowerCase().replace(/[\s_-]/g, "");
  const fromCompact = ACTION_TYPE_ALIASES[lowerCompact];
  if (fromCompact && CANONICAL_SET.has(fromCompact)) return fromCompact;

  return trimmed;
}

/**
 * Normalizes LLM JSON before Zod parse: fixes common `action.type` variants
 * (PascalCase, snake_case, kebab-case, synonyms).
 */
export function normalizeDesignAgentPlanJson(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.actions)) return raw;
  return {
    ...obj,
    actions: obj.actions.map((action) => {
      if (!action || typeof action !== "object" || Array.isArray(action)) return action;
      const a = action as Record<string, unknown>;
      const t = typeof a.type === "string" ? a.type : undefined;
      if (t === undefined) return action;
      const next = resolveActionType(t);
      return next === t ? action : { ...a, type: next };
    }),
  };
}
