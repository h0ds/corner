import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";
import './assets/fonts.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem 
      storageKey="ui-theme"
      themes={['light', 'dark', 'black']}
    >
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
