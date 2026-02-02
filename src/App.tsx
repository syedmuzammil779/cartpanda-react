import { ReactFlowProvider } from "reactflow";
import { FunnelBuilder } from "./components/FunnelBuilder";

function App() {
  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen bg-gray-100">
        <FunnelBuilder />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
