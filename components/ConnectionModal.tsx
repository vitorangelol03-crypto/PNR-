import React, { useState, useEffect } from 'react';
import { SupabaseConfig } from '../types';
import { Database, Key } from 'lucide-react';

interface Props {
  onConnect: (config: SupabaseConfig) => void;
}

export const ConnectionModal: React.FC<Props> = ({ onConnect }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  
  useEffect(() => {
    // Check local storage for persistence
    const storedUrl = localStorage.getItem('sb_url');
    const storedKey = localStorage.getItem('sb_key');
    if (storedUrl && storedKey) {
      onConnect({ url: storedUrl, key: storedKey });
    }
  }, [onConnect]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      localStorage.setItem('sb_url', url);
      localStorage.setItem('sb_key', key);
      onConnect({ url, key });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Conectar Base de Dados</h2>
          <p className="text-gray-500 mt-2">Insira as credenciais do seu projeto Supabase.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">https://</span>
              <input
                type="text"
                className="pl-16 w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="seu-projeto.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anon / Public Key</label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                className="pl-10 w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200"
          >
            Acessar Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};