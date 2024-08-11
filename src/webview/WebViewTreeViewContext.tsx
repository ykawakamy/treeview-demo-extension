import { createContext, Children, useContext, ReactNode, useState, useEffect, Dispatch, SetStateAction } from "react";
import { vscode } from "./vscode-wrapper";
import { TreeViewContextBaseEvent, TreeViewContextEvent } from "ExtensionEvent";
import { Menu, MenuDefinition } from "MenuDefinition";


export interface WebviewTreeviewContextType {
  viewId: string;
  menuDefinition: MenuDefinition;

  setMenuDefinition: Dispatch<SetStateAction<MenuDefinition>>;
}

export const WebviewTreeviewContext = createContext<WebviewTreeviewContextType>(null as any);

export interface WebviewTreeviewContextProviderProp{
  viewId: string;
  children: ReactNode;
}

export function WebviewTreeviewContextProvider(props:WebviewTreeviewContextProviderProp){
  const [viewId, setViewId] = useState(props.viewId);
  const [menuDefinition, setMenuDefinition] = useState<MenuDefinition>({ actionBarMenu:[], contextMenu:[] });

  const contextValue = { viewId, menuDefinition, setMenuDefinition };
  return <WebviewTreeviewContext.Provider value={contextValue}>
    { props.children }
  </WebviewTreeviewContext.Provider>;
}

export function postMessageToExtension(viewId: string, message: TreeViewContextEvent) {
  vscode.postMessage<TreeViewContextEvent & TreeViewContextBaseEvent>({ viewId: viewId!, ...message });
}