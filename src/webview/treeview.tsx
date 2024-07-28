import { TreeItem } from "vscode";
import useEvent from "@react-hook/event";
import { TreeItemCollapsibleState, VsccTreeViewItem } from "./treeviewitem";
import { useCallback, useEffect, useReducer, useState } from "react";
import { VirtualTreeId, VirtualTreeItem } from "../TreeViewContext";
import { vscode } from "./vscode-wrapper";

export interface VsccTreeViewEvent {
  parentId: VirtualTreeId;
  type: string;
  elements: VirtualTreeItem[];
}

export interface VsccTreeViewProp {
  viewId?: string;
}

export function VsccTreeView(prop: VsccTreeViewProp) {
  const [selectedId, setSelectedId] = useState<VirtualTreeId>(undefined);
  const [treeItems, setTreeItems] = useState<VirtualTreeItem[]>([]);
  const prefix = "";
  useEvent(window, "message", (e: MessageEvent<VsccTreeViewEvent>) => {
    const message = e.data;
    const typeWithPrefix = message.type;
    if (typeWithPrefix?.startsWith(prefix)) {
      const type = typeWithPrefix.substring(prefix.length);
      switch (type) {
        case "list":
          setTreeItems(message.elements);
          break;
        case "list-patch":
          // clone
          const index = treeItems.findIndex((item) => item.index === message.parentId);
          if (index === -1) {
            return;
          }
          if (message.elements[0].collapsibleState === TreeItemCollapsibleState.Collapsed) {
            let len = treeItems.length - index;
            const indent = treeItems[index].indent;
            for (let i = index + 1; i < treeItems.length; i++) {
              const item = treeItems[i];
              if (item.indent <= indent) {
                len = i - index;
                break;
              }
            }
            const clone = treeItems.slice();
            clone.splice(index, len, ...message.elements);
            setTreeItems(clone);
          } else {
            const clone = treeItems.slice();
            clone.splice(index, 1, ...message.elements);
            setTreeItems(clone);
          }
          break;
        case "item-patch":
          itemPatch(message);
          break;
      }
    }
  });
  function itemPatch(message: VsccTreeViewEvent) {
    const index = treeItems.findIndex((item) => item.index === message.parentId);
    if (index === -1) {
      return;
    }
    const clone = treeItems.slice();
    clone.splice(index, 1, ...message.elements);
    setTreeItems(clone);
  }
  useEffect(() => {
    vscode.postMessage({ type: "componentLoaded" });
  }, []);

  return (
    <div>
      {treeItems.map((x) => {
        return <VsccTreeViewItem item={x} key={x.index} isSelected={selectedId=== x.index} onSelect={setSelectedId} />;
      })}
    </div>
  );
}
