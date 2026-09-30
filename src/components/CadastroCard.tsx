import React, { useState } from 'react';
import { User, CreditCard, Phone, UserPlus, Mail, Lock, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { registerUserWithAuth } from '../lib/firebaseService';

interface CadastroCardProps {
  onRegisterSuccess: (newUser: UserProfile) => void;
  onGoToLogin: () => void;
}

export const CadastroCard: React.FC<CadastroCardProps> = ({
  onRegisterSuccess,
  onGoToLogin,
}) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  // Format CPF helper (000.000.000-00)
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setCpf(value);
  };

  // Format Phone/WhatsApp helper ((00) 90000-0000)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
      value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    setWhatsapp(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !password.trim() || !cpf.trim() || !whatsapp.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.trim().length < 6) {
      alert('A senha deve conter no mínimo 6 caracteres para salvar no Firebase Authentication.');
      return;
    }

    const newUser: UserProfile = {
      name: nome,
      email: email.trim(),
      cpf: cpf,
      phone: whatsapp,
      referredByStore: '',
      crNumber: 'CR-' + Math.floor(100000 + Math.random() * 900000),
      crValidity: '12/2028',
      password: password,
    };

    setLoading(true);
    try {
      await registerUserWithAuth(newUser);
      alert(`Cadastro realizado com sucesso!\nO e-mail foi cadastrado no Firebase Authentication e no Banco de Dados.\n\nVocê já pode entrar na tela de login com:\nE-mail: ${newUser.email}`);
      onRegisterSuccess(newUser);
    } catch (err: any) {
      console.error('Erro ao registrar usuário:', err);
      alert(err?.message || 'Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#182216] rounded-xl shadow-2xl border border-[#2d3e28] p-6 md:p-8 max-w-md mx-auto my-6 transition-all text-slate-100">
      <div className="text-center mb-6 border-b border-[#2d3e28] pb-4">
        <div className="w-12 h-12 bg-red-900/40 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-700/50 shadow-md">
          <UserPlus className="w-6 h-6" />
        </div>
        <h2 id="cadastro-title" className="text-xl font-bold text-white tracking-tight">
          Cadastro de Novo Cliente
        </h2>
        <p className="text-xs text-slate-300 mt-1">Registre seus dados e crie seu login de acesso</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            Nome Completo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <User className="w-4 h-4" />
            </div>
            <input
              id="cad-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            E-mail (Para Login)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="cad-email"
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
            Criar Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="cad-senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha de acesso"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            CPF
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <CreditCard className="w-4 h-4" />
            </div>
            <input
              id="cad-cpf"
              type="text"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            Contato (WhatsApp)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <Phone className="w-4 h-4" />
            </div>
            <input
              id="cad-tel"
              type="tel"
              value={whatsapp}
              onChange={handlePhoneChange}
              placeholder="(00) 90000-0000"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
            />
          </div>
        </div>

        <button
          id="cadastro-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg shadow-lg hover:shadow-red-900/40 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cadastrando no Firebase...</span>
            </>
          ) : (
            <span>Finalizar Cadastro</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[#2d3e28] text-center text-xs text-slate-400">
        Já possui uma conta?{' '}
        <button
          onClick={onGoToLogin}
          className="text-orange-400 font-bold hover:text-orange-300 hover:underline cursor-pointer"
        >
          Fazer Login
        </button>
      </div>
    </div>
  );
};
