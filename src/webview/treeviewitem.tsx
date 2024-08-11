import useEvent from "@react-hook/event";
import { VirtualTreeId } from "ExtensionEvent";
import { Menu, MenuDefinition } from "MenuDefinition";
import { memo, useContext, useDebugValue, useRef } from "react";
import { VirtualTreeItem } from "../TreeviewOnWebviewProvider";
import { postMessageToExtension, WebviewTreeviewContext } from "./WebViewTreeViewContext";
export interface VsccTreeViewItemProp {
  item: VirtualTreeItem;
  isSelected: boolean;

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
export const VsccTreeViewItem = memo(function VsccTreeViewItemInner(prop: VsccTreeViewItemProp) {
  useDebugValue( console.log("VsccTreeViewItem"));

  const { viewId, menuDefinition } = useContext(WebviewTreeviewContext);  
  const actionBarMenu = menuDefinition.actionBarMenu;
  function onClickTwistle() {
    switch (item.collapsibleState) {
      case TreeItemCollapsibleState.Collapsed:
        postMessageToExtension(viewId, { type: "clickItem", index: item.index, collapsibleState: TreeItemCollapsibleState.Expanded });
        break;
      case TreeItemCollapsibleState.Expanded:
        postMessageToExtension(viewId, { type: "clickItem", index: item.index, collapsibleState: TreeItemCollapsibleState.Collapsed });
        break;
    }
  }

  function onClickItem() {
    prop.onSelect(item.index);
    if (item.hasCommand) {
      postMessageToExtension(viewId, { type: "command", index: item.index });
      return;
    }
    onClickTwistle();
  }
  let hoverDelay: any;
  function onHoverItem(item: VirtualTreeItem) {
    clearTimeout(hoverDelay);
    hoverDelay = setTimeout(() => {
      postMessageToExtension(viewId, { type: "hoverItem", index: item.index });
    }, 300);
  }
  function onUnhoverItem(prop: VirtualTreeItem) {
    clearTimeout(hoverDelay);
  }
  function onAction(menu: Menu, item: VirtualTreeItem,) {
    postMessageToExtension(viewId, { type: "commandByAction", command: menu.command, index: item.index });
  }
  const item = prop.item;
  function basename(path: string) {
    const index = path.lastIndexOf("/");
    return path.substring(index !== -1 ? index + 1 : 0);
  }
  const convertLabel = (item: VirtualTreeItem) => {
    const label = item.label;
    if (typeof label === "string") {
      return label;
    }
    return label.label;
  };
  const convertDescription = (item: VirtualTreeItem) => {
    const description = item.description;
    if (typeof description === "string") {
      return description;
    }
    return "";
  };
  const label = convertLabel(item);
  const description = convertDescription(item);
  const indent = item.indent - 1;
  const twistableIconMap = {
    [TreeItemCollapsibleState.Collapsed]: "treeview-item-twist-toggle-show codicon-chevron-right",
    [TreeItemCollapsibleState.Expanded]: "treeview-item-twist-toggle-show codicon-chevron-down",
    [TreeItemCollapsibleState.None]: "",
  };
  const twistableIcon = twistableIconMap[item.collapsibleState ?? 0 /*TreeItemCollapsibleState.None*/];
  const resourceIcon = item.iconClasses;
  // !!item.resourceUri ? "file-icon" : "";

  const inputRef = useRef<HTMLInputElement>(null);
  useEvent(inputRef, "keydown", (e) => {
    switch (e.code) {
      case "ArrowLeft":
        if (item.collapsibleState === TreeItemCollapsibleState.Expanded) {
          postMessageToExtension(viewId, { type: "clickItem", index: item.index, collapsibleState: TreeItemCollapsibleState.Collapsed });
        }
        break;
      case "ArrowRight":
        if (item.collapsibleState === TreeItemCollapsibleState.Collapsed) {
          postMessageToExtension(viewId, { type: "clickItem", index: item.index, collapsibleState: TreeItemCollapsibleState.Expanded });
        }
        break;
      case "Space":
        if (item.collapsibleState === TreeItemCollapsibleState.None) {
          onClickItem();
        }else{
          onClickTwistle();
        }
        break;
      case "Enter":
        onClickItem();
        break;
      default:
        return;
    }
    e.preventDefault();
  });
  const indentBar = new Array(indent).fill(0).map((v,i)=>{
    return <div key={i} className="treeview-item-indent-guide"></div>;
  });
  return (
    <>
      <div className={"treeview-item-row show-file-icons " + (prop.isSelected ? "selected" : "")}
        data-vscode-context={JSON.stringify({viewItem: item.contextValue, index: item.index})}
        onMouseOver={() => onHoverItem(item)}
        onMouseOut={() => onUnhoverItem(item)}
        data-xxx-tooltip={item.tooltip ?? ""}
      >
        <div className="treeview-item-indent" style={{ width: indent * INDENT_PX }}>
          {indentBar}
        </div>
        <div className={"treeview-item-twist-toggle codicon " + twistableIcon}
          onClick={onClickTwistle}
        ></div>
        <label className="treeview-item-container">
          <input ref={inputRef} type="radio" name={viewId} className="treeview-item-row-focus" />
          <div className={"treeview-item-icon-container " + resourceIcon}
            onClick={onClickItem}
          >
            <span className="treeview-item-label-container">{label}</span>
            <span className="treeview-item-describe-container">{description}</span>
          </div>
          <div className="treeview-item-actionbar">
            {actionBarMenu.filter(x => {
              if (x.when) {
                return x.when.expr(item, { view: viewId });
              }
              return true;
            }).map(action => {
              return <div key={action.command} className={`treeview-item-actionbar-item ${action.iconClasses}`} onClick={() => { onAction(action, item); }}></div>;
            })}
          </div>
        </label>
      </div>
    </>
  );
});
