import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import App from "./App.jsx";
import { SpeedInsights } from "@vercel/speed-insights/next"


createRoot(document.getElementById("root")).render(
  
  <BrowserRouter>
    <App />
    <SpeedInsights />
  </BrowserRouter>
  
);
