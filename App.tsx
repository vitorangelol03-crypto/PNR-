import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ConnectionModal } from './components/ConnectionModal';
import { initSupabase } from './services/supabaseService';
import { SupabaseConfig } from './types';

function App() {
  const [isConnected, setIsConnected] = useState(false);

  // Attempt to connect via env vars if available (auto-connect)
  useEffect(() => {
    // Use provided credentials as default to ensure the app works immediately
    let envUrl = "https://rmaiejrslwbbizviqejx.supabase.co";
    let envKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtYWllanJzbHdiYml6dmlxZWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTc5ODgsImV4cCI6MjA4MDE3Mzk4OH0.tytuI3FDbeQ-r-3heD8i6W_UJQ707CEiVA4bHulloss";

    // Safely try to override with environment variables if they exist
    try {
      const meta = import.meta as any;
      // Explicitly check if meta.env is defined before accessing properties
      // This prevents the "Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')" error
      if (meta && meta.env) {
        if (meta.env.VITE_SUPABASE_URL) {
          envUrl = meta.env.VITE_SUPABASE_URL;
        }
        if (meta.env.VITE_SUPABASE_ANON_KEY) {
          envKey = meta.env.VITE_SUPABASE_ANON_KEY;
        }
      }
    } catch (error) {
      console.warn("Environment variable access skipped:", error);
    }

    if (envUrl && envKey) {
      const client = initSupabase({ url: envUrl, key: envKey });
      if (client) {
        setIsConnected(true);
      }
    }
  }, []);

  const handleManualConnect = (config: SupabaseConfig) => {
    const client = initSupabase(config);
    if (client) {
      setIsConnected(true);
    } else {
      alert("Falha ao inicializar conexão. Verifique a URL e a Chave.");
    }
  };

  if (!isConnected) {
    return <ConnectionModal onConnect={handleManualConnect} />;
  }

  return <Dashboard />;
}

export default App;