import { createContext, useContext } from "react";
import { vscode } from "./vscode-wrapper";
import { TreeViewContextBaseEvent, TreeViewContextEvent } from "ExtensionEvent";


export interface WebviewTreeviewContextType{
  viewId?: string;
}

// export const WebviewTreeviewContext = createContext<WebviewTreeviewContextType>({});

export function postMessageToExtension(viewId: string, message: TreeViewContextEvent){
  vscode.postMessage<TreeViewContextEvent & TreeViewContextBaseEvent>({viewId: viewId!, ...message});
}