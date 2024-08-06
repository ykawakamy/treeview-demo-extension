import { vscode } from "./vscode-wrapper";
import {  VirtualTreeItem } from "../TreeViewContext";
import { DOMAttributes, memo, MouseEventHandler } from "react";
import { Menu, MenuDefinition } from "MenuDefinition";
import { VirtualTreeId } from "ExtensionEvent";
import { postMessageToExtension } from "./WebViewTreeViewContext";
export interface VsccTreeViewItemProp {
  item: VirtualTreeItem;
  isSelected: boolean;
  menuDefinition: MenuDefinition;
  viewId?: string;
  onSelect: (id: VirtualTreeId) => void;
}

export enum TreeItemCollapsibleState {
  /**
   * Determines an item can be neither collapsed nor expanded. Implies it has no children.
   */
  None = 0,
  /**
   * Determines an item is collapsed
   */
  Collapsed = 1,
  /**
   * Determines an item is expanded
   */
  Expanded = 2
}

const INDENT_PX = 8;
export const VsccTreeViewItem = memo( (prop: VsccTreeViewItemProp)=> VsccTreeViewItemInner(prop));
export const VsccTreeViewItemInner = (prop: VsccTreeViewItemProp)=>{
  console.log("VsccTreeViewItem");
  /**
   * onClick 
   */
  function onClickItem(item: VirtualTreeItem) {
    prop.onSelect(item.index);
    switch (item.collapsibleState) {
      case TreeItemCollapsibleState.Collapsed:
      case TreeItemCollapsibleState.Expanded:
        postMessageToExtension({ type: "clickItem", index: item.index });
        break;
    }
  }
  let hoverDelay: any;
  function onHoverItem(item: VirtualTreeItem) {
    clearTimeout(hoverDelay);
    hoverDelay = setTimeout(() => {
      postMessageToExtension({ type: "hoverItem", index: item.index });
    }, 300);
  }
  function onUnhoverItem(prop: VirtualTreeItem) {
    clearTimeout(hoverDelay);
  }
  function onAction(menu: Menu, item: VirtualTreeItem, ){
    postMessageToExtension({type: "command", command: menu.command, index: item.index});
  }
  const item = prop.item;
  function basename(path: string) {
    const index = path.lastIndexOf("/");
    return path.substring(index !== -1 ? index + 1 : 0);
  }
  const convertLabel = (item: VirtualTreeItem) => {
    const label = item.label;
    if (!label) {
      return basename(item.resourceUri?.path ?? "");
    }
    if (typeof label === "string") {
      return label;
    }
    return label.label;
  };
  const convertDescription = (item: VirtualTreeItem) => {
    const description = item.description;
    if (description === true) {
      return item.resourceUri?.path;
    }
    if (typeof description === "string") {
      return description;
    }
    return "";
  };
  const label = convertLabel(item);
  const description = convertDescription(item);
  const indent = item.indent * INDENT_PX;
  const twistableIconMap = {
    [1 /*TreeItemCollapsibleState.Collapsed*/]: "codicon-chevron-right",
    [2 /*TreeItemCollapsibleState.Expanded*/]: "codicon-chevron-down",
    [0 /*TreeItemCollapsibleState.None*/]: "test",
  };
  const twistableIcon = twistableIconMap[item.collapsibleState ?? 0 /*TreeItemCollapsibleState.None*/];
  const resourceIcon = item.iconClasses;
  // !!item.resourceUri ? "file-icon" : "";

  const events: DOMAttributes<HTMLDivElement> = {

  };
  return (
    <>
      <div className={"treeview-item-row show-file-icons " + (prop.isSelected ? "selected" : "")}
        onMouseOver={ () => onHoverItem(item)}
        onMouseOut={ () => onUnhoverItem(item)}
      >
        <div className="treeview-item-indent" style={{ width: indent }}></div>
        <div className={"treeview-item-twist-toggle codicon " + twistableIcon}></div>
        <div className={"treeview-item-icon-container " + resourceIcon}
            onClick={ (e) => {
              onClickItem(item);
            }}
        >
          <span className="treeview-item-label-container">{label}</span>
          <span className="treeview-item-describe-container">{description}</span>
        </div>
        <div className="treeview-item-actionbar" data-vscode-context={item.contextValue}>
          {prop.menuDefinition.menu.filter(x => {
            if (x.when) {
              return x.when.expr(item, { view: prop.viewId });
            }
            return true;
          }).map(action => {
            return <div key={action.command} className={`treeview-item-actionbar-item ${action.iconClasses}`} onClick={()=>{onAction(action, item);}}></div>;
          })}
        </div>
      </div>
    </>
  );
}
