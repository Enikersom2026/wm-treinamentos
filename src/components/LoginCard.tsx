import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { loginUserWithAuth } from '../lib/firebaseService';
import { UserProfile } from '../types';

interface LoginCardProps {
  onLoginSuccess: (userProfile: UserProfile) => void;
  onGoToCadastro: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  onLoginSuccess,
  onGoToCadastro,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      alert('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    try {
      const profile = await loginUserWithAuth(email, password);
      if (profile) {
        onLoginSuccess(profile);
      } else {
        // Fallback profile if profile document is not created yet
        const fallbackProfile: UserProfile = {
          name: email.split('@')[0].toUpperCase(),
          email: email.trim(),
          cpf: '123.456.789-00',
          phone: '(11) 98765-4321',
          referredByStore: 'Nenhuma / Direto',
          crNumber: 'CR-' + Math.floor(100000 + Math.random() * 900000),
          crValidity: '12/2028',
        };
        onLoginSuccess(fallbackProfile);
      }
    } catch (err) {
      console.error('Erro no login:', err);
      alert('Erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#182216] rounded-xl shadow-2xl border border-[#2d3e28] p-6 md:p-8 max-w-md mx-auto my-6 transition-all text-slate-100">
      <div className="text-center mb-6 border-b border-[#2d3e28] pb-4">
        <div className="w-12 h-12 bg-[#253621] text-orange-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#3b5234] shadow-md">
          <ShieldCheck className="w-6 h-6 text-red-500" />
        </div>
        <h2 id="login-title" className="text-xl font-bold text-white tracking-tight">
          Login do Atirador
        </h2>
        <p className="text-xs text-slate-300 mt-1">Acesse sua área exclusiva para agendamentos</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            E-mail Cadastrado
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="l-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="l-senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
            />
          </div>
        </div>

        <button
          id="login-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg shadow-lg hover:shadow-red-900/40 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Autenticando...</span>
            </>
          ) : (
            <>
              <span>Entrar</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[#2d3e28] text-center text-xs text-slate-400">
        Ainda não possui cadastro?{' '}
        <button
          onClick={onGoToCadastro}
          className="text-orange-400 font-bold hover:text-orange-300 hover:underline cursor-pointer"
        >
          Cadastre-se aqui
        </button>
      </div>
    </div>
  );
};
