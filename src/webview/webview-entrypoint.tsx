import ReactDOM from "react-dom/client";
import { VsccTreeView } from "./treeview";
import { StrictMode } from "react";
import { WebviewTreeviewContext, WebviewTreeviewContextProvider } from "./WebViewTreeViewContext";

const container = document.getElementById('root')!;
const root = ReactDOM.createRoot(container);

root.render(
  <StrictMode>
    <div>
      TreeView on webview
      <input type="text" />
    </div>
    <div style={{ "height": "40vh", "overflowY": "scroll" }}>
      <WebviewTreeviewContextProvider viewId={"treeviewDemo"}>
        <VsccTreeView></VsccTreeView>

      </WebviewTreeviewContextProvider>
    </div>
    <div>
      TreeView2 on webview
    </div>
    <div style={{ "height": "40vh", "overflowY": "scroll" }}>
      <WebviewTreeviewContextProvider viewId={"treeviewDemo2"}>
        <VsccTreeView ></VsccTreeView>
      </WebviewTreeviewContextProvider>
    </div>
    <div>
      TreeView on webview
    </div>
  </StrictMode>
);