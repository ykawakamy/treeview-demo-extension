import { VscodeContributesCommandsIconDefinition, VscodeContributesIconDefinition } from "IconTheme";
import { VirtualTreeItem } from "./TreeViewContext";

export interface MenuDefinition {
  menu: Menu[];
}

export interface VscodePackageJSON {
  contributes: {
    commands: ManifestCommand[];
    menus: ManifestMenus;
  }
}
export interface ManifestMenus {
  "view/item/context": ManifestViewItemContext[];
}

/**
 * vscode contributes menus compatible
 * @see https://code.visualstudio.com/api/references/contribution-points#contributes.menus
 * 
 * @export
 * @interface ManifestMenu
 */
export interface ManifestViewItemContext {
  command: string;
  alt?: string;
  when?: string;
  group?: "inline";
}

/**
 * @see https://code.visualstudio.com/api/references/contribution-points#contributes.commands
 *
 * @export
 * @interface ManifestCommand
 */
export interface ManifestCommand {
  command: string;
  title: string;
  category?: string;
  icon: VscodeContributesCommandsIconDefinition;
}

export interface Menu {
  command: string;
  alt?: string;
  when?: WhenClause;
  unparsedWhen?: string;
  group?: string;
  title: string;
  category?: string;
  icon: VscodeContributesCommandsIconDefinition;
  iconClasses?: string
}

export type WhenClause = {
	op: string;
  tree: WhenClause[];
  expr: WhenClauseExpr;
};

export type WhenClauseExpr = (item: VirtualTreeItem, context: Record<string, any>) => any;
