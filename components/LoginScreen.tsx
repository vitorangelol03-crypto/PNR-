import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface LoginScreenProps {
  onAuthenticate: () => void;
}

export function LoginScreen({ onAuthenticate }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === '684171') {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('cd_logistica_auth', JSON.stringify({
        authenticated: true,
        date: today,
        timestamp: Date.now()
      }));
      onAuthenticate();
    } else {
      setError(true);
      setIsShaking(true);
      setPassword('');
      setTimeout(() => {
        setIsShaking(false);
        setError(false);
      }, 820);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-green-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 inline-block">
              <Lock className="w-16 h-16 text-white" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-6xl font-bold text-white mb-3 tracking-tight">
            CD LOGISTICA
          </h1>
          <p className="text-xl text-blue-100">Sistema de Gestão</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha de Acesso
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                className={`
                  w-full px-4 py-3 border-2 rounded-lg text-lg text-center tracking-widest
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                  transition-all duration-200
                  ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}
                  ${isShaking ? 'animate-shake' : ''}
                `}
                autoFocus
                autoComplete="off"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 text-center animate-fade-in">
                  Senha incorreta. Tente novamente.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-semibold text-lg
                       hover:from-blue-700 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg"
            >
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-blue-100 text-sm mt-6">
          Entre em contato com o administrador se esqueceu a senha
        </p>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-shake {
          animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}
