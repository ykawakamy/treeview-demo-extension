import { TreeViewContextBaseEvent, TreeViewContextCommandByActionEvent, TreeViewContextCommandEvent, TreeViewContextEvent, TreeViewContextMenuEvent, TreeViewContextTreeItemEvent, VirtualTreeId } from "ExtensionEvent";
import * as vscode from "vscode";
import { VsccTreeViewEvent } from "webview/WebViewEvent";
import { loadContributesMenu, resolveTreeIconClasses } from "./ContributesUtil";
import { MenuDefinition } from "./MenuDefinition";

export interface VirtualTreeItem extends vscode.TreeItem {
  index: VirtualTreeId;
  parentId?: VirtualTreeId;
  indent: number;
  iconClasses: string;
}

export class TreeviewOnWebviewProvider<T extends object> {
  webviewView!: vscode.WebviewView;
  realItemFromId: Map<VirtualTreeId, T> = new Map<VirtualTreeId, T>();
  virtualItemFromId: Map<VirtualTreeId, VirtualTreeItem> = new Map<VirtualTreeId, VirtualTreeItem>();
  treeItemhandles: Map<T, VirtualTreeItem> = new Map<T, VirtualTreeItem>();
  treeItems: Map<VirtualTreeId, VirtualTreeItem[]> = new Map<VirtualTreeId, VirtualTreeItem[]>();
  latestIds = 1;
  root = {} as T;
  menu: MenuDefinition = { actionBarMenu: [], contextMenu:[] };
  CommandPrefix: string = "treeviewWrap";

  constructor(private context: vscode.ExtensionContext, private provider: vscode.TreeDataProvider<T>, private viewId: string) {
    const onDidChange = provider.onDidChangeTreeData!;
    context.subscriptions.push(
      onDidChange((listener: void | T | T[] | null | undefined): void => {
        if (!listener) {
          this.realItemFromId = new Map<VirtualTreeId, T>();
          this.virtualItemFromId = new Map<VirtualTreeId, VirtualTreeItem>();
          this.treeItemhandles = new Map<T, VirtualTreeItem>();
          this.treeItems = new Map<VirtualTreeId, VirtualTreeItem[]>();
          this.latestIds = 1;
          this.refresh();
        } else {
          if (!Array.isArray(listener)) {
            listener = [listener];
          }
          for (const realItem of listener) {
            const virutalItem = this.treeItemhandles.get(realItem);
            if (virutalItem) {
              const virtualId = virutalItem.index;
              this.realItemFromId.delete(virtualId);
              this.virtualItemFromId.delete(virtualId);
              this.treeItemhandles.delete(realItem);
              this.treeItems.delete(virtualId);
              this.refresh(virutalItem);
            }
          }
        }
      })
    );
  }

  async attactWebview(webviewView: vscode.WebviewView) {
    this.webviewView = webviewView;

    await this.loadContributesMenu(this.context.extension);

    this.context.subscriptions.push(
      this.webviewView.webview.onDidReceiveMessage(async (event: TreeViewContextEvent & TreeViewContextBaseEvent) => {
        if( event.viewId !== this.viewId){
          return;
        }
        switch (event.type) {
          case "componentLoaded":
            await this.postMessageToWebView({ type: "load-context-item", menuDefinition: this.menu });
            await this.refresh();
            break;
          case "hoverItem":
            this.onHoverItem(event);
            break;
          case "clickItem":
            this.onClickItem(event);
            break;
          case "command":
            this.onCommand(event);
            break;
          case "commandByAction":
            this.onCommandByAction(event);
            break;
        }
      })
    );
  }
  onCommand(event: TreeViewContextCommandEvent) {
    const id = event.index;
    const item = this.virtualItemFromId.get(id);
    if (!item || !item.command) {
      return;
    }
    vscode.commands.executeCommand(item.command.command, ...item.command.arguments ?? []);
  }
  onCommandByAction(event: TreeViewContextCommandByActionEvent) {
    const id = event.index;
    const item = this.realItemFromId.get(id);
    if (!item) {
      return;
    }
    vscode.commands.executeCommand(event.command, item);
  }
  async onHoverItem(event: TreeViewContextTreeItemEvent) {
    const id = event.index;
    const virtualItem = await this.resolve(id);
    const message: VsccTreeViewEvent = {
      type: "item-patch",
      elements: [virtualItem as VirtualTreeItem],
      parentId: id,
    };
    this.postMessageToWebView(message);
  }

  private async postMessageToWebView(message: VsccTreeViewEvent) {
    await this.webviewView.webview.postMessage({ viewId: this.viewId, ...message });
  }

  async onClickItem(event: TreeViewContextTreeItemEvent) {
    const id = event.index;
    const virtualItem = this.virtualItemFromId.get(id);
    if (!virtualItem) {
      return;
    }
    switch (virtualItem.collapsibleState) {
      case vscode.TreeItemCollapsibleState.Collapsed:
        virtualItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        await this.refresh(virtualItem);
        break;
      case vscode.TreeItemCollapsibleState.Expanded:
        virtualItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        this.postMessageToWebView({
          type: "list-patch",
          elements: [virtualItem],
          parentId: id,
        });
        break;
    }
  }
  async refresh(virtualItem?: VirtualTreeItem | null) {
    const id = virtualItem?.index;
    const virtualList: VirtualTreeItem[] = [];
    const realItem = this.realItemFromId.get(id);
    if (virtualItem) {
      virtualList.push(virtualItem);
    }
    vscode.window.withProgress(
      {
        location: { viewId: this.webviewView.viewType },
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ message: vscode.l10n.t("refresh...") });
        await this.collectList(virtualList, id, virtualItem?.indent ?? 0);
        progress.report({ message: vscode.l10n.t("refresh(collect complete)..."), increment: 50 });
        if (id) {
          this.postMessageToWebView({
            type: "list-patch",
            elements: virtualList,
            parentId: id,
          });
        } else {
          this.postMessageToWebView({
            type: "list",
            elements: virtualList,
          });
        }
        progress.report({ message: vscode.l10n.t("complete..."), increment: 100 });
      }
    );
  }

  async resolve(id: VirtualTreeId) {
    const realItem = this.realItemFromId.get(id);
    if (!realItem) {
      return;
    }
    const parent = this.virtualItemFromId.get(id);
    let virtualItem = await this.getVirtualTreeItem(realItem, id, parent?.indent ?? 0);
    if (!this.provider.resolveTreeItem) {
      return virtualItem;
    }
    const cancelSrc = new vscode.CancellationTokenSource();
    const newVirtualItem = await this.provider.resolveTreeItem(virtualItem, realItem, cancelSrc.token);
    // TODO update virtualItemFromId
    // return newVirtualItem;
    return virtualItem;
  }

  private async collectList(virtualList: VirtualTreeItem[], parentId: VirtualTreeId | undefined, parentIndent: number) {
    if (this.treeItems.has(parentId)) {
      const vlist = this.treeItems.get(parentId);
      for (const virtualItem of vlist ?? []) {
        virtualList.push(virtualItem);
        if (virtualItem.collapsibleState === vscode.TreeItemCollapsibleState.Expanded) {
          await this.collectList(virtualList, virtualItem.index, parentIndent + 1);
        }
      }
    } else {
      const listOnParent = [];
      const realItem = this.realItemFromId.get(parentId);
      const realList = await asPromise<T[]>(this.provider.getChildren(realItem));
      for (const realItem of realList) {
        let virtualItem = await this.getVirtualTreeItem(realItem, parentId ?? -1, parentIndent + 1);
        listOnParent.push(virtualItem);
        virtualList.push(virtualItem);
        if (virtualItem.collapsibleState === vscode.TreeItemCollapsibleState.Expanded) {
          await this.collectList(virtualList, virtualItem.index, parentIndent + 1);
        }
      }
      this.treeItems.set(parentId, listOnParent);
    }
  }

  private async getVirtualTreeItem(realItem: T, parentId: VirtualTreeId | undefined, indent: number) {
    const virtualItem = this.treeItemhandles.get(realItem);
    if (virtualItem !== undefined) {
      return virtualItem;
    }
    const treeItem = await asPromise<vscode.TreeItem>(this.provider.getTreeItem(realItem));
    const iconClasses = await resolveTreeIconClasses(treeItem);
    const id = this.latestIds++;
    const newVirtualItem = {
      ...treeItem,
      index: id,
      parentId: parentId,
      indent: indent,
      iconClasses,
    };
    this.realItemFromId.set(id, realItem);
    this.virtualItemFromId.set(id, newVirtualItem);
    this.treeItemhandles.set(realItem, newVirtualItem);
    return newVirtualItem;
  }

  async loadContributesMenu(extension: vscode.Extension<any>) {
    const menu = await loadContributesMenu(this.webviewView.webview, extension);
    this.menu.actionBarMenu.push(...menu.actionBarMenu);
    this.menu.contextMenu.push(...menu.contextMenu.map(contextMenu=>({
      ...contextMenu,
      unparsedWhen: `webviewId == ${ this.viewId } && ( ${contextMenu.unparsedWhen }) `
    })));
  }

  async registerCommand(command: string, callback?: (...args: any[]) => any, thisArg?: any, subscriptions: any[] = []){
    if(callback){
      subscriptions.push(vscode.commands.registerCommand(command, callback));
    }
    subscriptions.push(vscode.commands.registerCommand( this.CommandPrefix+":"+command, (event: TreeViewContextMenuEvent) => {
      const id = event.index;
      const item = this.realItemFromId.get(id);
      if (!item) {
        return;
      }
      vscode.commands.executeCommand(command, item);
    }));
  }

}

function isThenable<T>(value: any): value is Thenable<T> {
  if (value === null || value === undefined) {
    return false;
  }
  return typeof value.then === "function";
}

function asPromise<T>(value: vscode.ProviderResult<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (isThenable<T>(value)) {
      value.then(resolve, reject);
    } else {
      resolve(value as any);
    }
  });
}
