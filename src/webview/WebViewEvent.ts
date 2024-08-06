import { VirtualTreeId } from "ExtensionEvent";
import { MenuDefinition } from "MenuDefinition";
import { VirtualTreeItem } from "TreeViewContext";

export type VsccTreeViewEvent = VsccTreeViewItemEvent | VsccTreeViewMenuDefinitionEvent;
export type VsccTreeViewEventWithViewId = VsccTreeViewEvent & VsccTreeViewBaseEvent;

export interface VsccTreeViewBaseEvent{
  viewId: string;
}
export interface VsccTreeViewItemEvent {
  type: "list"| "list-patch"| "item-patch";
  parentId?: VirtualTreeId;
  elements: VirtualTreeItem[];
}
export interface VsccTreeViewMenuDefinitionEvent {
  type: "load-context-item";
  menuDefinition: MenuDefinition;
}
