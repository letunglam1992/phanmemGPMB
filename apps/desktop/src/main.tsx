import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./giao-dien.css";
import { UngDung } from "./UngDung";
import { NhaCungCap } from "./ung-dung";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NhaCungCap>
      <UngDung />
    </NhaCungCap>
  </StrictMode>,
);
