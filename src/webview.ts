import * as vscode from "vscode";
import { TreeviewOnWebviewProvider } from "./TreeviewOnWebviewProvider";
import { TreeviewProvider } from "./TreeViewProvider";
import path from "path";
import { IconTheme } from "./IconTheme";
import { FileExplorer, FileSystemProvider } from "./fileExplorer";
import { loadIconTheme } from "./ContributesUtil";

export class DemoWebview implements vscode.WebviewViewProvider {
  public static readonly treeviewOnWebviewId = "treeviewOnWebview";
  public static readonly realTreeviewId = "realTreeview";
  private _extensionUri;
  treeContext!: TreeviewOnWebviewProvider<any>;
  treeContext2!: TreeviewOnWebviewProvider<any>;

  constructor(private context: vscode.ExtensionContext) {
    this._extensionUri = context.extensionUri;

    
    // const provider = new TreeviewProvider<any>();
    const provider = new FileSystemProvider();
    this.treeContext = new TreeviewOnWebviewProvider(context, provider, "treeviewDemo");
    const provider2 = new FileSystemProvider();
    this.treeContext2 = new TreeviewOnWebviewProvider(context, provider2, "treeviewDemo2");
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(DemoWebview.treeviewOnWebviewId, this));
    const provider3 = new FileSystemProvider();
    context.subscriptions.push(vscode.window.createTreeView(DemoWebview.realTreeviewId, { treeDataProvider: provider3 }));

    const disposable = vscode.commands.registerCommand("vscode-webview-treeview.helloWorld", () => {
      this.treeContext.refresh();
    });
    context.subscriptions.push(vscode.commands.registerCommand("vscode-webview-treeview.refresh", () => {
      provider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand("vscode-webview-treeview.reflesh2", () => {
      provider2.refresh();
    }));

    context.subscriptions.push(disposable);

    const registerProbeAction = (command: string) => {
      this.treeContext.registerCommand(command, (...args: any) => {
        const json = JSON.stringify(args, null, 2);
        // vscode.window.showInformationMessage(json);
        console.log(`\u001b[31m-- ${command}\n\u001b[0m${json}\n--`);
      }, context.subscriptions);
    };
    // vscode.commands.registerCommand('fileExplorer.openFile', (resource) => this.openResource(resource));
    registerProbeAction('fileExplorer.openFile');
    registerProbeAction('fileExplorer.openDir');
    registerProbeAction('vscode-webview-treeview.openFile');
    registerProbeAction('vscode-webview-treeview.isFile');
    registerProbeAction('vscode-webview-treeview.isFolder');

  }

  public async resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<any>, _token: vscode.CancellationToken) {
    const iconThemeId = vscode.workspace.getConfiguration("workbench").get<string>("iconTheme");
    const exts = vscode.extensions.all;
    const iconTheme = await loadIconTheme(webviewView, exts, iconThemeId);
    if(!iconTheme){
      throw new Error("failed to loadIconTheme.");
    }

    this.treeContext.attactWebview(webviewView);
    this.treeContext2.attactWebview(webviewView);

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri, iconTheme.uri],
    };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview, context.state, iconTheme.styleContent);
  }

  private async _getHtmlForWebview(webview: vscode.Webview, state: any, iconThemeStyle: { content: string; hasFileIcons: boolean; hasFolderIcons: boolean; hidesExplorerArrows: boolean }) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "dist", "webview-entrypoint.js"));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css"));
    const vsccTreeviewUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "src", "webview", "vscc-treeview.css"));

    // Use a nonce to only allow a specific script to be run.
    const nonce = crypto.randomUUID();

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
