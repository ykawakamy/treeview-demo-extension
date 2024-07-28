import { VirtualTreeItem } from "./TreeViewContext";

export interface MenuDefinition {}

export interface ManifestMenu {
  command: string;
  alt?: string;
  when?: string;
  group?: "inline";
}

export interface ManifestCommand {
  command: string;
  title: string;
  category?: string;
  icon: string;
}

export interface Menu {
  command: string;
  alt?: string;
  when?: WhenClause;
  group?: string;
  title: string;
  category?: string;
  icon: string;
}

export type WhenClause = {
	op: string;
  tree: WhenClause[];
  expr: WhenClauseExpr;
};

export type WhenClauseExpr = (item: VirtualTreeItem, context: Record<string, any>) => any;
