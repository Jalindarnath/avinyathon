import { createRoot } from 'react-dom/client'
import { AuthProvider } from "./context/AuthContext";
import './index.css'
import App from './App.jsx'
import { SiteProvider } from "./context/SiteContext";

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <SiteProvider>
      <App />
    </SiteProvider>
  </AuthProvider>
);