import { vscode } from "./vscode-wrapper";
import { VirtualTreeId, VirtualTreeItem } from "../TreeViewContext";
import { DOMAttributes, MouseEventHandler } from "react";
export interface VsccTreeViewItemProp {
  item: VirtualTreeItem;
  isSelected: boolean;
  onSelect: (id: VirtualTreeId)=>void;
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

export function VsccTreeViewItem(prop: VsccTreeViewItemProp) {
  function onClickItem(item: VirtualTreeItem) {
    switch (item.collapsibleState) {
      case TreeItemCollapsibleState.Collapsed:
      case TreeItemCollapsibleState.Expanded:
        vscode.postMessage({ type: "clickItem", index: item.index });
        break;
    }
  }
  let hoverDelay: any;
  function onHoverItem(item: VirtualTreeItem) {
    clearTimeout(hoverDelay);
    hoverDelay = setTimeout(() => {
      vscode.postMessage({ type: "hoverItem", index: item.index });
    }, 300);
  }
  function onUnhoverItem(prop: VirtualTreeItem) {
    clearTimeout(hoverDelay);
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
    onClick: (e) => {
      prop.onSelect(item.index);
      onClickItem(item);
    },
    onMouseOver: () => onHoverItem(item),
    onMouseOut: () => onUnhoverItem(item),
  };
  return (
    <>
      <div className={"treeview-itme-row show-file-icons " + (prop.isSelected ? "selected" : "") } {...events}>
        <div className="treeview-item-indent" style={{ width: indent }}></div>
        <div className={"treeview-item-twist-toggle codicon " + twistableIcon}></div>
        <div className={"treeview-item-icon-container " + resourceIcon}>
          <span className="treeview-item-label-container">{label}</span>
          <span className="treeview-item-describe-container">{description}</span>
        </div>
        <div className="treeview-item-actionbar" data-vscode-context={item.contextValue}>
          {}
        </div>
      </div>
    </>
  );
}
