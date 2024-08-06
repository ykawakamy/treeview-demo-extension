import { MenuDefinition } from "MenuDefinition";


export type VirtualTreeId = number | undefined;

/**
 * Event from Webview to Extension.
 */
export type TreeViewContextEvent =
  | TreeViewContextCompleteLoadedEvent
  | TreeViewContextTreeItemEvent
  | TreeViewContextCommandEvent
  ;

export interface TreeViewContextCompleteLoadedEvent {
  type: "componentLoaded";
}

export interface TreeViewContextTreeItemEvent {
  type: "hoverItem" | "clickItem";
  index: VirtualTreeId;
}

export interface TreeViewContextCommandEvent {
  type: "command";
  index: VirtualTreeId;
  command: string;
}