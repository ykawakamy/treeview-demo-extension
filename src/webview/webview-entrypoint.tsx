import ReactDOM from "react-dom/client";
import { VsccTreeView } from "./treeview";

const container = document.getElementById('root')!;
const root = ReactDOM.createRoot(container);

root.render(
  <div>
    <div>
      It's TreeView on webview
      <input type="text"/>
    </div>
    <div style={{"height": "80vh", "overflowY":"scroll"}}>
      <VsccTreeView viewId={"treeviewDemo"}></VsccTreeView>
    </div>
    <div>
      It's TreeView on webview
    </div>
  </div>
);