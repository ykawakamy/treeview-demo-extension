import { createContext } from "react";
import { vscode } from "./vscode-wrapper";
import { TreeViewContextEvent } from "ExtensionEvent";


export const TreeviewContext = createContext({

});

export function postMessageToExtension(message: TreeViewContextEvent){
  vscode.postMessage(message);
}