import { groupCollapsed } from "console";
import { release } from "os";
import * as vscode from "vscode";
import { FileStat } from "./fileExplorer";

export type VirtualTreeId = number
export interface TreeItemEvent {
  type: string;
  index: VirtualTreeId;
}

export interface VirtualTreeItem extends vscode.TreeItem {
  index: VirtualTreeId;
  indent: number;
  iconClasses: string;
}

export class TreeviewContext<T extends object> {
  webviewView!: vscode.WebviewView;
  treeItems: Map<T, T[]> = new Map<T, T[]>();
  realItemFromId: Map<VirtualTreeId, T> = new Map<VirtualTreeId, T>();
  treeItemhandles: Map<T, VirtualTreeItem> = new Map<T, VirtualTreeItem>();
  root = {} as T;
  latestIds = 0;

  constructor(private provider: vscode.TreeDataProvider<T>) {
    const onDidChange = provider.onDidChangeTreeData!;
    // onDidChange((listener: void | T | T[] | null | undefined): void => {});
  }

  attactWebview(webviewView: vscode.WebviewView) {
    this.webviewView = webviewView;
    this.webviewView.webview.onDidReceiveMessage(async (event: TreeItemEvent) => {
      switch (event.type) {
        case "componentLoaded":
          await this.refresh();
          break;
        case "clickItem":
          const realItem = this.realItemFromId.get(event.index);
          if (!realItem) {
            return;
          }
          const item = this.treeItemhandles.get(realItem);
          if (!item) {
            return;
          }
          switch (item.collapsibleState) {
            case vscode.TreeItemCollapsibleState.Collapsed:
              item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
              await this.refresh(event.index);
              break;
            case vscode.TreeItemCollapsibleState.Expanded:
              item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
              await this.refresh(event.index);
              break;
          }
          break;
        case "command":
          // if (item.command) {
          //   vscode.commands.executeCommand(item.command.command, item.command.arguments);
          // }
          break;
      }
    });
  }
  async refresh(id?: VirtualTreeId) {
    const virtualList: VirtualTreeItem[] = [];
    const realItem = id ? this.realItemFromId.get(id) : undefined;
    const realList = await asPromise<T[]>(this.provider.getChildren(realItem));
    this.treeItems.set(realItem ?? this.root, realList);
    await this.collectList(realList, virtualList);
    this.webviewView.webview.postMessage({
      type: "list",
      elements: virtualList,
    });
  }

  async resolve(realItem: T) {
    let virtualTreeItem = await this.getVirtualTreeItem(realItem);
    if (!this.provider.resolveTreeItem) {
      return virtualTreeItem;
    }
    const cancelSrc = new vscode.CancellationTokenSource();
    return await this.provider.resolveTreeItem(virtualTreeItem, realItem, cancelSrc.token);
  }

  private async collectList(realList: T[], virtualList: VirtualTreeItem[], indent: number = 0) {
    for (const realItem of realList) {
      let virtualTreeItem = await this.getVirtualTreeItem(realItem, indent);

      // treeItem.id = "" + ++this.latestIds;
      virtualList.push(virtualTreeItem);
      if (virtualTreeItem.collapsibleState === vscode.TreeItemCollapsibleState.Expanded) {
        const realList = await asPromise<T[]>(this.provider.getChildren(realItem));
        this.treeItems.set(realItem, realList);
        await this.collectList(realList, virtualList, indent + 1);
      }
    }
  }

  private async getVirtualTreeItem(realItem: T, indent: number = 0) {
    let virtualTreeItem = this.treeItemhandles.get(realItem);
    if (virtualTreeItem === undefined) {
      const treeItem = await asPromise<vscode.TreeItem>(this.provider.getTreeItem(realItem));
      const iconClasses = await this.resolveIconClasses(treeItem);
      virtualTreeItem = {
        ...treeItem,
        index: this.latestIds,
        indent: indent,
        iconClasses,
      };
      this.realItemFromId.set(this.latestIds, realItem);
      this.treeItemhandles.set(realItem, virtualTreeItem);
      this.latestIds++;
    }
    return virtualTreeItem;
  }

  async resolveIconClasses(treeItem: vscode.TreeItem): Promise<string> {
    // from https://github.com/microsoft/vscode/blob/14addc7735fcb99fd42c35e5d7e8e984611132b8/src/vs/editor/common/services/getIconClasses.ts#L17
    const fileIconDirectoryRegex = /(?:\/|^)(?:([^\/]+)\/)?([^\/]+)$/;
    function isThemeColor(obj: any): obj is vscode.ThemeColor {
      return obj && typeof obj === "object" && typeof (<any>obj).id === "string";
    }
    function isThemeIcon(obj: any): obj is vscode.ThemeIcon {
      return obj && typeof obj === "object" && typeof (<vscode.ThemeIcon>obj).id === "string" && (typeof (<vscode.ThemeIcon>obj).color === "undefined" || isThemeColor((<vscode.ThemeIcon>obj).color));
    }
    function isUri(thing: any): thing is vscode.Uri {
      if (thing instanceof vscode.Uri) {
        return true;
      }
      if (!thing) {
        return false;
      }
      return (
        typeof (<vscode.Uri>thing).authority === "string" &&
        typeof (<vscode.Uri>thing).fragment === "string" &&
        typeof (<vscode.Uri>thing).path === "string" &&
        typeof (<vscode.Uri>thing).query === "string" &&
        typeof (<vscode.Uri>thing).scheme === "string" &&
        typeof (<vscode.Uri>thing).fsPath === "string" &&
        typeof (<vscode.Uri>thing).with === "function" &&
        typeof (<vscode.Uri>thing).toString === "function"
      );
    }
    // maybe maskAsciiCC.
    function cssEscape(str: string) {
      return str.replace(/[\x11\x12\x14\x15\x40]/g, "/"); // HTML class names can not contain certain whitespace characters, use / instead, which doesn't exist in file names.
    }
    const icon = treeItem.iconPath;
    const resource = treeItem.resourceUri;
    if (isThemeIcon(icon) && icon.id !== vscode.ThemeIcon.File.id && icon.id !== vscode.ThemeIcon.Folder.id) {
      return `codicon-${icon.id} predefined-file-icon'`;
    }

    if (isUri(icon)) {
      return "";
    }

    const classes: string[] = [];
    if (resource) {
      const stat = await vscode.workspace.fs.stat(resource);
      const iconId = stat.type === vscode.FileType.Directory ? vscode.ThemeIcon.Folder.id : vscode.ThemeIcon.File.id;
      // we always set these base classes even if we do not have a path
      classes.push(iconId === vscode.ThemeIcon.Folder.id ? "folder-icon" : "file-icon");

      // Get the path and name of the resource. For data-URIs, we need to parse specially
      let name: string | undefined;
      if (resource.scheme === "data") {
        // data:MIME;a:AAA;b;BBB;base64,hhh scheme
        const metadata = /^data:([^;]+;.*$)/.exec(resource.path) ?? [, ""];
        name = metadata[1];
      } else {
        const match = resource.path.match(fileIconDirectoryRegex);
        if (match) {
          name = cssEscape(match[2].toLowerCase());
          if (match[1]) {
            classes.push(`${cssEscape(match[1].toLowerCase())}-name-dir-icon`); // parent directory
          }
        } else {
          name = cssEscape(resource.authority.toLowerCase());
        }
      }

      // // Root Folders
      // if (fileKind === FileKind.ROOT_FOLDER) {
      //   classes.push(`${name}-root-name-folder-icon`);
      // }

      // Folders
      if (iconId === vscode.ThemeIcon.Folder.id) {
        classes.push(`${name}-name-folder-icon`);
      }

      // Files
      else {
        // Name & Extension(s)
        if (name) {
          classes.push(`${name}-name-file-icon`);
          classes.push(`name-file-icon`); // extra segment to increase file-name score
          // Avoid doing an explosive combination of extensions for very long filenames
          // (most file systems do not allow files > 255 length) with lots of `.` characters
          // https://github.com/microsoft/vscode/issues/116199
          if (name.length <= 255) {
            const dotSegments = name.split(".");
            for (let i = 1; i < dotSegments.length; i++) {
              classes.push(`${dotSegments.slice(i).join(".")}-ext-file-icon`); // add each combination of all found extensions if more than one
            }
          }
          classes.push(`ext-file-icon`); // extra segment to increase file-ext score
        }

        async function detectLanguageId(resource: vscode.Uri): Promise<string | undefined> {
          const document = await vscode.workspace.openTextDocument(resource);
          return document.languageId;
        }
        // Detected Mode
        const detectedLanguageId = await detectLanguageId(resource);
        if (detectedLanguageId) {
          classes.push(`${cssEscape(detectedLanguageId)}-lang-file-icon`);
        }
      }
    }
    return classes.join(" ");
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
