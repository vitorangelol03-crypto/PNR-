import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ConnectionModal } from './components/ConnectionModal';
import { initSupabase } from './services/supabaseService';
import { SupabaseConfig } from './types';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Attempt to connect via env vars if available (auto-connect)
  useEffect(() => {
    // Use current project credentials as default
    let envUrl = "https://vjkjusmzvxdzdeogmqdx.supabase.co";
    let envKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqa2p1c216dnhkemRlb2dtcWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg4NjAsImV4cCI6MjA4MDc5NDg2MH0.yLNq6sJ6Q32IdeUKhBd2Xx5YPC_we0U4GKwaUjMBcBc";

    // Safely try to override with environment variables if they exist
    try {
      const meta = import.meta as any;
      // Explicitly check if meta.env is defined before accessing properties
      if (meta && meta.env) {
        if (meta.env.VITE_SUPABASE_URL) {
          envUrl = meta.env.VITE_SUPABASE_URL;
        }
        if (meta.env.VITE_SUPABASE_ANON_KEY) {
          envKey = meta.env.VITE_SUPABASE_ANON_KEY;
        }
      }
    } catch (error) {
      console.warn("Variáveis de ambiente não acessíveis:", error);
    }

    if (envUrl && envKey) {
      try {
        const client = initSupabase({ url: envUrl, key: envKey });
        if (client) {
          setIsConnected(true);
          setConnectionError(null);
        } else {
          const errorMsg = "Erro de conexão com o banco de dados. Verifique sua conexão.";
          setConnectionError(errorMsg);
          console.error(errorMsg);
        }
      } catch (error: any) {
        const errorMsg = `Erro ao inicializar Supabase: ${error?.message || 'Erro desconhecido'}`;
        setConnectionError(errorMsg);
        console.error("Erro ao inicializar Supabase:", error);
      }
    } else {
      setConnectionError("Credenciais do Supabase não encontradas.");
    }
  }, []);

  const handleManualConnect = (config: SupabaseConfig) => {
    try {
      const client = initSupabase(config);
      if (client) {
        setIsConnected(true);
        setConnectionError(null);
      } else {
        const errorMsg = "Falha ao inicializar conexão. Verifique a URL e a Chave.";
        setConnectionError(errorMsg);
        alert(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = `Erro ao conectar: ${error?.message || 'Erro desconhecido'}`;
      setConnectionError(errorMsg);
      alert(errorMsg);
    }
  };

  if (!isConnected) {
    return <ConnectionModal onConnect={handleManualConnect} error={connectionError} />;
  }

  return <Dashboard />;
}

export default App;