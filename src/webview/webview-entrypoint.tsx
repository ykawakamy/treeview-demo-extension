import ReactDOM from "react-dom/client";
import { VsccTreeView } from "./treeview";

const container = document.getElementById('root')!;
const root = ReactDOM.createRoot(container);

root.render(<VsccTreeView></VsccTreeView>);