import useEvent from "@react-hook/event";
import { MenuDefinition } from "MenuDefinition";
import { useContext, useDebugValue, useEffect, useState } from "react";
import { VirtualTreeId } from "../ExtensionEvent";
import { VirtualTreeItem } from "../TreeviewOnWebviewProvider";
import { TreeItemCollapsibleState, VsccTreeViewItem } from "./treeviewitem";
import { VsccTreeViewEventWithViewId, VsccTreeViewItemEvent } from "./WebViewEvent";
import { postMessageToExtension, WebviewTreeviewContext } from "./WebViewTreeViewContext";
import { parseWhenClause } from "./WhenClauseParser";

export interface VsccTreeViewProp {
}

export function VsccTreeView(prop: VsccTreeViewProp) {
  useDebugValue( console.log("VsccTreeView"));
  const { viewId, setMenuDefinition } = useContext(WebviewTreeviewContext);  
  const [selectedId, setSelectedId] = useState<VirtualTreeId>(undefined);
  const [treeItems, setTreeItems] = useState<VirtualTreeItem[]>([]);
  useEvent(window, "message", (e: MessageEvent<VsccTreeViewEventWithViewId>) => {
    const message = e.data;
    if( message.viewId !== viewId){
      return;
    }
    console.log(`${message.viewId}: ${message.type} `);
    const type = message.type;
    switch (type) {
      case "list":
        setTreeItems(message.elements);
        break;
      case "list-patch":{
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
      }
      case "item-patch":
        itemPatch(message);
        break;
      case "load-context-item":
        message.menuDefinition.actionBarMenu?.forEach(x=>{
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
    postMessageToExtension(viewId, { type: "componentLoaded" });
  }, []);

  return (
    <div className="treeview" data-vscode-context={`{"view":"${viewId}", "preventDefaultContextMenuItems": true}`}>
      {treeItems.map((x) => {
        return <VsccTreeViewItem 
          item={x} 
          key={x.index} 
          isSelected={selectedId=== x.index}
          onSelect={setSelectedId} />;
      })}
    </div>
  );
}
