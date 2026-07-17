import React, { useRef, useState } from "react";
import JarCanvas from "./render/JarCanvas.jsx";
import Sidebar from "./render/Sidebar.jsx";
import { World } from "./sim/engine.js";
import { CONFIG } from "./sim/config.js";

export default function App() {
  const worldRef = useRef(null);
  if (!worldRef.current) worldRef.current = new World(CONFIG);

  const [tool, setTool] = useState("seed");        // "seed" | "water"
  const [seedType, setSeedType] = useState("sprout");

  return (
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start", padding: 24 }}>
      <Sidebar
        world={worldRef.current}
        tool={tool} setTool={setTool}
        seedType={seedType} setSeedType={setSeedType}
      />
      <div>
        <h1 style={{ margin: "0 0 2px", fontSize: 20, letterSpacing: 1 }}>JARDEN</h1>
        <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--muted)" }}>
          an ecosystem in a jar
        </p>
        <JarCanvas world={worldRef.current} tool={tool} seedType={seedType} />
      </div>
    </div>
  );
}
