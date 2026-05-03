export type EditorProjectOwnership = "owned" | "shared";

export interface EditorProject {
  id: string;
  name: string;
  ownership: EditorProjectOwnership;
}
