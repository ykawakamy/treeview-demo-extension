import * as vscode from "vscode";

export class TreeviewProvider<T extends { key: string }> implements vscode.TreeDataProvider<T> {
  private _onDidChangeTreeData: vscode.EventEmitter<T | undefined> =
    new vscode.EventEmitter<T | undefined>();
  readonly onDidChangeTreeData: vscode.Event<T | undefined> =
    this._onDidChangeTreeData.event;

  update(data: T) {
    this._onDidChangeTreeData.fire(data);
  }

  getTreeItem(element: T): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const treeItem = getTreeItem(element.key);
    treeItem.id = element.key;
    return treeItem;
  }
  getChildren(element?: T | undefined): T[] {
    return getChildren(element ? element.key : undefined).map(key => getNode<T>(key));
  }
  getParent?(element: T): vscode.ProviderResult<T> {
    const key = element.key;
    const parentKey = key.substring(0, key.length - 1);
    return parentKey ? new Key(parentKey) as T : undefined;
  }
}
const tree: any = {
  a: {
    aa: {
      aaa: {
        aaaa: {
          aaaaa: {
            aaaaaa: {},
          },
        },
      },
    },
    ab: {},
  },
  b: {
    ba: {},
    bb: {},
  },
};

function getChildren(key: string | undefined): string[] {
  if (!key) {
    return Object.keys(tree);
  }
  const treeElement = getTreeElement(key);
  if (treeElement) {
    return Object.keys(treeElement);
  }
  return [];
}

function getTreeItem(key: string): vscode.TreeItem {
	const treeElement = getTreeElement(key);
	// An example of how to use codicons in a MarkdownString in a tree item tooltip.
	const tooltip = new vscode.MarkdownString(`$(zap) Tooltip for ${key}`, true);
	return {
		label: /**vscode.TreeItemLabel**/<any>{ label: key, highlights: key.length > 1 ? [[key.length - 2, key.length - 1]] : void 0 },
		tooltip,
		collapsibleState: treeElement && Object.keys(treeElement).length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
	};
}

function getTreeElement(element: string): any {
	let parent = tree;
	for (let i = 0; i < element.length; i++) {
		parent = parent[element.substring(0, i + 1)];
		if (!parent) {
			return null;
		}
	}
	return parent;
}
function getNode<T>(key: string): T {
	if (!nodes[key]) {
		nodes[key] = new Key(key);
	}
	return nodes[key];
}
const nodes: any = {};
class Key {
	constructor(readonly key: string) { }
}