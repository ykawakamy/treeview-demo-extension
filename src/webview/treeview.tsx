import { TreeItem } from "vscode";
import useEvent from "@react-hook/event";
import { TreeItemCollapsibleState, VsccTreeViewItem } from "./treeviewitem";
import { useCallback, useEffect, useReducer, useState } from "react";
import { VirtualTreeItem } from "../TreeViewContext";
import { vscode } from "./vscode-wrapper";
import { MenuDefinition } from "MenuDefinition";
import { parseWhenClause } from "./WhenClauseParser";
import { VirtualTreeId } from "../ExtensionEvent";
import { VsccTreeViewEventWithViewId, VsccTreeViewItemEvent } from "./WebViewEvent";
import { postMessageToExtension } from "./WebViewTreeViewContext";

export interface VsccTreeViewProp {
  viewId?: string;
}

export function VsccTreeView(prop: VsccTreeViewProp) {
  console.log("VsccTreeView");
  const [selectedId, setSelectedId] = useState<VirtualTreeId>(undefined);
  const [treeItems, setTreeItems] = useState<VirtualTreeItem[]>([]);
  const [menuDefinition, setMenuDefinition] = useState<MenuDefinition>({menu:[]});
  const prefix = "";
  useEvent(window, "message", (e: MessageEvent<VsccTreeViewEventWithViewId>) => {
    const message = e.data;
    if( message.viewId !== prop.viewId){
      return;
    }
    console.log(`${message.viewId}: ${message.type} `);
    const type = message.type;
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
      case "load-context-item":
        message.menuDefinition.menu?.forEach(x=>{
          if( x.unparsedWhen){
            x.when = parseWhenClause(x.unparsedWhen);
          }
        });
        setMenuDefinition(message.menuDefinition);
        break;
    }
  });
  function itemPatch(message: VsccTreeViewItemEvent) {
    const index = treeItems.findIndex((item) => item.index === message.parentId);
    if (index === -1) {
      return;
    }
    const clone = treeItems.slice();
    clone.splice(index, 1, ...message.elements);
    setTreeItems(clone);
  }
  useEffect(() => {
    postMessageToExtension({ type: "componentLoaded" });
  }, []);

  return (
    <div>
      {treeItems.map((x) => {
        return <VsccTreeViewItem 
          item={x} 
          menuDefinition = {menuDefinition}
          viewId={prop.viewId}
          key={x.index} 
          isSelected={selectedId=== x.index}
          onSelect={setSelectedId} />;
      })}
    </div>
  );
}
