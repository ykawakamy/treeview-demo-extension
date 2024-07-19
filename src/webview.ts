import * as vscode from "vscode";
import { TreeviewContext } from "./TreeViewContext";
import { TreeviewProvider } from "./TreeViewProvider";
import path from "path";
import { IconTheme, toStyleSheet } from "./IconTheme";
import { FileExplorer, FileSystemProvider } from "./fileExplorer";

export class DemoWebview implements vscode.WebviewViewProvider {
  public static readonly viewId = "treeview-demo";

  private _extensionUri;
  treeContext!: TreeviewContext<any>;

  constructor(private context: vscode.ExtensionContext) {
    this._extensionUri = context.extensionUri;

    
    // const provider = new TreeviewProvider<any>();
    const provider = new FileSystemProvider();
    const provider2 = new FileSystemProvider();
    this.treeContext = new TreeviewContext(provider);
    const disposable = vscode.commands.registerCommand("vscode-webview-treeview.helloWorld", () => {
      this.treeContext.refresh();
    });
    
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(DemoWebview.viewId, this));
    context.subscriptions.push(vscode.window.registerTreeDataProvider(DemoWebview.viewId+"1", provider2));
    context.subscriptions.push(disposable);

  }

  public async resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<any>, _token: vscode.CancellationToken) {
    const iconThemeId = vscode.workspace.getConfiguration("workbench").get("iconTheme");
    const exts = vscode.extensions.all;
    let activeIconTheme: any = {
      uri: null,
    };
    for (const ext of exts) {
      const iconThemes = ext.packageJSON?.contributes?.iconThemes;
      for (const iconTheme of iconThemes ?? []) {
        if (iconTheme?.id === iconThemeId) {
          activeIconTheme.uri = ext.extensionUri;
          activeIconTheme.path = iconTheme.path;
        }
      }
    }
    const iconThemeJsonUri = vscode.Uri.joinPath(activeIconTheme.uri, activeIconTheme.path);
    const iconThemeJson = await vscode.workspace.fs.readFile(iconThemeJsonUri);
    const iconThemeData: IconTheme = JSON.parse(new TextDecoder().decode(iconThemeJson));
    const iconThemeBaseUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(activeIconTheme.uri, path.dirname(activeIconTheme.path)));
    const iconThemeStyle = await toStyleSheet(iconThemeData, iconThemeBaseUri);
    
    this.treeContext.attactWebview(webviewView);

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri, activeIconTheme.uri],
    };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview, context.state, iconThemeStyle);
  }

  private async _getHtmlForWebview(webview: vscode.Webview, state: any, iconThemeStyle: { content: string; hasFileIcons: boolean; hasFolderIcons: boolean; hidesExplorerArrows: boolean }) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "dist", "webview-entrypoint.js"));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css"));
    const vsccTreeviewUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "src", "webview", "vscc-treeview.css"));

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return /*html*/ `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta property="csp-nonce" content="${nonce}">
        <link href="${codiconsUri}" rel="stylesheet">
        <link href="${vsccTreeviewUri}" rel="stylesheet">
        <style nonce="${nonce}">${iconThemeStyle.content}</style>
        <title>Search Query</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
