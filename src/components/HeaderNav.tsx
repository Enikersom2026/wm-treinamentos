import React from 'react';
import { Target, User, UserPlus, Home, Shield, LogOut, ShieldAlert, LayoutDashboard, KeyRound, Bell } from 'lucide-react';
import { PortalMode, Screen, AdminScreen, UserProfile } from '../types';

interface HeaderNavProps {
  portalMode: PortalMode;
  onSelectPortalMode: (mode: PortalMode) => void;
  clientScreen: Screen;
  onNavigateClient: (screen: Screen) => void;
  adminScreen: AdminScreen;
  onNavigateAdmin: (screen: AdminScreen) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  companyName?: string;
  logoUrl?: string;
  unreadNotificationCount?: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  portalMode,
  onSelectPortalMode,
  clientScreen,
  onNavigateClient,
  adminScreen,
  onNavigateAdmin,
  currentUser,
  onLogout,
  companyName = 'Clube de Tiro e Caça Alvo Certo',
  logoUrl,
  unreadNotificationCount = 0,
}) => {
  return (
    <header className="bg-[#1c2619] text-white shadow-xl border-b border-[#2d3e28] mb-6">
      {/* Top Bar for Switching Systems */}
      <div className="system-switcher bg-[#0a0e09] px-4 py-1.5 border-b border-[#23321f] text-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400/80 font-medium hidden sm:inline">Sistema Militar Integrado:</span>
            <button
              id="btn-mode-cliente"
              onClick={() => onSelectPortalMode('cliente')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                portalMode === 'cliente'
                  ? 'active bg-red-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-300 hover:text-white hover:bg-[#283723]'
              }`}
            >
              Visualizar Cliente
            </button>
            <span className="text-emerald-900">|</span>
            <button
              id="btn-mode-admin"
              onClick={() => onSelectPortalMode('admin')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                portalMode === 'admin'
                  ? 'active bg-orange-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-300 hover:text-white hover:bg-[#283723]'
              }`}
            >
              Visualizar Admin
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-emerald-400/90">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Sincronização em Tempo Real
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo and Title */}
        <div 
          onClick={() => {
            if (portalMode === 'cliente') onNavigateClient('main');
            else onNavigateAdmin('a-dashboard');
          }} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img 
            id="img-app-logo"
            src={logoUrl || "/logo.png"} 
            alt="WM Treinamentos Logo" 
            className="w-11 h-11 rounded-lg object-cover border border-[#3b5235] shadow-lg group-hover:scale-105 transition-transform" 
          />
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide flex items-center gap-2 text-white">
              {companyName}
            </h1>
            <p className="text-xs text-slate-300 flex items-center gap-1.5">
              {portalMode === 'admin' ? (
                <span className="text-orange-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Módulo de Administração do Clube
                </span>
              ) : (
                <span className="text-emerald-300/80">Portal do Atirador & Agendamentos</span>
              )}
            </p>
          </div>
        </div>

        {/* CLIENT NAV MOCK */}
        {portalMode === 'cliente' && (
          <div className="nav-mock flex items-center gap-1 bg-[#283723] p-1.5 px-3 rounded-lg border border-[#3b5034] text-sm">
            <button
              id="nav-login-btn"
              onClick={() => {
                if (currentUser && clientScreen === 'main') {
                  onNavigateClient('main');
                } else {
                  onNavigateClient('login');
                }
              }}
              className="px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 text-slate-200 hover:text-white bg-[#1c2719] hover:bg-red-700 cursor-pointer"
            >
              <User className="w-4 h-4 text-orange-400" />
              {currentUser && clientScreen === 'main' ? 'Área Logada' : 'Tela de Login'}
            </button>
          </div>
        )}

        {/* ADMIN NAV MOCK */}
        {portalMode === 'admin' && (
          <div className="nav-mock flex items-center gap-1 bg-[#283723] p-1.5 px-3 rounded-lg border border-[#3b5034] text-sm">
            <button
              id="nav-admin-login-btn"
              onClick={() => onNavigateAdmin('a-login')}
              className="px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 text-slate-200 hover:text-white bg-[#1c2719] hover:bg-orange-700 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-orange-400" />
              <span>Tela de Login Admin</span>
            </button>
          </div>
        )}

        {/* User badge if logged in */}
        {currentUser && portalMode === 'cliente' && clientScreen === 'main' && (
          <div className="hidden lg:flex items-center gap-3 bg-[#283723] px-3 py-1.5 rounded-lg border border-[#3c5235] text-xs">
            <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-slate-100">{currentUser.name}</p>
                {unreadNotificationCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full animate-pulse flex items-center gap-0.5">
                    <Bell className="w-2.5 h-2.5" />
                    {unreadNotificationCount}
                  </span>
                )}
              </div>
              <p className="text-orange-300 text-[10px]">CPF: {currentUser.cpf || '***.***.***-**'}</p>
            </div>
            <button
              onClick={onLogout}
              title="Sair"
              className="text-slate-300 hover:text-red-400 p-1 transition-colors ml-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
