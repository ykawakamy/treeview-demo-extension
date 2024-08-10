import { TreeItemCollapsibleState } from "webview/treeviewitem";


export type VirtualTreeId = number | undefined;

/**
 * Event from Webview to Extension.
 */
export type TreeViewContextEvent =
  | TreeViewContextCompleteLoadedEvent
  | TreeViewContextTreeItemEvent
  | TreeViewContextCommandByActionEvent
  | TreeViewContextCommandEvent
  ;

export interface TreeViewContextBaseEvent{
  viewId: string;
}
export interface TreeViewContextCompleteLoadedEvent {
  type: "componentLoaded";
}

export interface TreeViewContextTreeItemEvent {
  type: "hoverItem" | "clickItem";
  index: VirtualTreeId;
  collapsibleState?: TreeItemCollapsibleState;
}

export interface TreeViewContextCommandByActionEvent {
  type: "commandByAction";
  index: VirtualTreeId;
  command: string;
}

export interface TreeViewContextCommandEvent {
  type: "command";
  index: VirtualTreeId;
}

export interface TreeViewContextMenuEvent {
  index: VirtualTreeId;
}