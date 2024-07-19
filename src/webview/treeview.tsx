import { TreeItem } from "vscode";
import useEvent from "@react-hook/event";
import { VsccTreeViewItem } from "./treeviewitem";
import { useCallback, useEffect, useReducer, useState } from "react";
import { VirtualTreeItem } from "../TreeViewContext";
import { vscode } from "./vscode-wrapper";

export interface VsccTreeViewEvent {
  type: string;
  elements: VirtualTreeItem[];
}

export interface VsccTreeViewProp {
  viewId?: string;
}

export function VsccTreeView(prop: VsccTreeViewProp) {
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
          break;
      }
    }
  });
  useEffect(() => {
    vscode.postMessage({ type: "componentLoaded" });
  }, []);

  return (
    <div>
      {treeItems.map((x) => {
        return <VsccTreeViewItem item={x} key={x.index} />;
      })}
    </div>
  );
}
