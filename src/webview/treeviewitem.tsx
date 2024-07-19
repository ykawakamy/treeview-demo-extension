import { vscode } from "./vscode-wrapper";
import { VirtualTreeItem } from "../TreeViewContext";
export interface VsccTreeViewItemProp {
  item: VirtualTreeItem;
}

const INDENT_PX = 8;

export function VsccTreeViewItem(prop: VsccTreeViewItemProp) {
  function onClickItem(prop: VirtualTreeItem) {
    vscode.postMessage({ type: "clickItem", item: prop, index: prop.index });
  }
  const item = prop.item;
  function basename(path: string) {
    const index = path.lastIndexOf("/");
    return path.substring(index !== -1 ? index+1 : 0);
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
  return (
    <>
      <div className="treeview-itme-row show-file-icons" title={JSON.stringify(item)} onClick={() => onClickItem(item)}>
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

