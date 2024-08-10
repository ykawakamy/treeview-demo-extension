import ReactDOM from "react-dom/client";
import { VsccTreeView } from "./treeview";
import { StrictMode } from "react";

const container = document.getElementById('root')!;
const root = ReactDOM.createRoot(container);

root.render(
  <StrictMode>
    <div>
      TreeView on webview
      <input type="text" />
    </div>
    <div style={{ "height": "40vh", "overflowY": "scroll" }}>
      
      <VsccTreeView viewId={"treeviewDemo"}></VsccTreeView>
    </div>
    <div style={{ "height": "40vh", "overflowY": "scroll" }}>
      <VsccTreeView viewId={"treeviewDemo2"}></VsccTreeView>
    </div>
    <div>
      TreeView on webview
    </div>
  </StrictMode>
);