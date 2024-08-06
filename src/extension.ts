// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DemoWebview } from './webview';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-webview-treeview" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	vscode.commands.registerCommand('fileExplorer.openFile', (resource) => vscode.window.showTextDocument(resource));
	const probeAction = (...args: any) => {
		const json = JSON.stringify(args, null, 2);
		vscode.window.showInformationMessage(json);
		console.log(json);
	};
	vscode.commands.registerCommand('fileExplorer.openDir', probeAction);
	vscode.commands.registerCommand('vscode-webview-treeview.openFile', probeAction);
	vscode.commands.registerCommand('vscode-webview-treeview.isFile', probeAction);
	vscode.commands.registerCommand('vscode-webview-treeview.isFolder', probeAction);
	new DemoWebview(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
