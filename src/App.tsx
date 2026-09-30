import React, { useState, useEffect } from 'react';
import { 
  PortalMode, 
  Screen, 
  AdminScreen, 
  UserProfile, 
  CompanySettings, 
  BankSettings, 
  MarketingSettings, 
  Instructor,
  Booking,
  ClientNotification
} from './types';
import { HeaderNav } from './components/HeaderNav';
import { LoginCard } from './components/LoginCard';
import { CadastroCard } from './components/CadastroCard';
import { MainClientArea } from './components/MainClientArea';
import { AdminLoginCard } from './components/AdminLoginCard';
import { AdminDashboard } from './components/AdminDashboard';
import {
  subscribeSettings,
  subscribeInstructors,
  subscribeBookings,
  subscribeBookingHistory,
  subscribeClients,
  subscribeScheduleSettings,
  subscribeAdminCredentials,
  subscribeClientNotifications,
  markNotificationAsReadInDb,
  markAllNotificationsAsReadInDb,
  updateScheduleSettings,
  saveCompanySettingsInDb,
  saveBankSettingsInDb,
  saveMarketingSettingsInDb,
  saveAdminCredentialsInDb,
  addInstructorInDb,
  deleteInstructorFromDb,
  createBookingInDb,
  updateBookingStatusInDb,
  deleteBookingFromDb,
  saveClientInDb,
  deleteClientFromDb,
} from './lib/firebaseService';

// LocalStorage helpers
const db = {
  get: <T,>(key: string, fallback: T): T => {
    try {
      const val = localStorage.getItem(key);
      return val ? (JSON.parse(val) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set: <T,>(key: string, data: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  },
};

export default function App() {
  const [portalMode, setPortalMode] = useState<PortalMode>('cliente');
  const [clientScreen, setClientScreen] = useState<Screen>('login');
  const [adminScreen, setAdminScreen] = useState<AdminScreen>('a-login');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => 
    db.get('usuarioLogado', null)
  );

  // Company Settings State
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() =>
    db.get('empresa', { name: 'Clube Alvo Certo' })
  );

  // Bank Settings State
  const [bankSettings, setBankSettings] = useState<BankSettings>(() =>
    db.get('banco', {
      pixKey: 'pix@clube.com',
      pixName: 'WM TREINAMENTOS',
      pixCity: 'PALMAS',
      bank: 'Banco do Brasil',
      agencyAccount: 'Ag: 0001 Conta: 12345-6',
    })
  );

  // Marketing Settings State
  const [marketingSettings, setMarketingSettings] = useState<MarketingSettings>(() =>
    db.get('marketing', {
      bannerText: '🎯 PROMOÇÃO DA SEMANA: 15% OFF em munição recarregada de 9mm! Use o cupom PROMO15 no balcão.',
      noticesText: 'Avisos de Novos Cursos: Inscrições abertas para Operador de Pistola Nível 1 no próximo sábado!',
    })
  );

  // Instructors State
  const [instructors, setInstructors] = useState<Instructor[]>(() =>
    db.get('instrutores', [
      { id: 'inst-1', name: 'Sargento Silva', iatNumber: 'IAT-88231' },
      { id: 'inst-2', name: 'Capitão Oliveira', iatNumber: 'IAT-44102' },
    ])
  );

  // Bookings State (Synced in Real-Time between Client and Admin)
  const [bookings, setBookings] = useState<Booking[]>(() =>
    db.get('agendamentos', [])
  );

  // Permanent Booking History State (Synced in Real-Time from Firestore historico_agendamentos)
  const [bookingHistory, setBookingHistory] = useState<Booking[]>([]);

  // Registered Clients State (Synced in Real-Time from Firestore)
  const [registeredClients, setRegisteredClients] = useState<UserProfile[]>([]);

  // Blocked time slots state (Synced in Real-Time from Firestore)
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);

  // Admin Password State (Synced in Real-Time from Firestore)
  const [adminPassword, setAdminPassword] = useState<string>(() =>
    db.get('adminPassword', '311982')
  );

  // Client Notifications State (Alertas visuais e push em tempo real)
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);

  // Subscribe to Client Notifications when currentUser is logged in
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeClientNotifications(
      currentUser.email || currentUser.name,
      (list) => setNotifications(list)
    );
    return () => unsub();
  }, [currentUser]);

  // Subscribe to Firestore Realtime Data
  useEffect(() => {
    const unsubSettings = subscribeSettings(
      (company) => setCompanySettings(company),
      (bank) => setBankSettings(bank),
      (mkt) => setMarketingSettings(mkt)
    );

    const unsubInstructors = subscribeInstructors((insts) => setInstructors(insts));

    const unsubBookings = subscribeBookings((bks) => setBookings(bks));

    const unsubBookingHistory = subscribeBookingHistory((hList) => setBookingHistory(hList));

    const unsubClients = subscribeClients((cls) => setRegisteredClients(cls));

    const unsubSchedule = subscribeScheduleSettings((slots) => setBlockedSlots(slots));

    const unsubAdmin = subscribeAdminCredentials((cred) => {
      if (cred.password) {
        setAdminPassword(cred.password);
      }
    });

    return () => {
      unsubSettings();
      unsubInstructors();
      unsubBookings();
      unsubBookingHistory();
      unsubClients();
      unsubSchedule();
      unsubAdmin();
    };
  }, []);

  useEffect(() => {
    db.set('adminPassword', adminPassword);
  }, [adminPassword]);

  // Auto-sync state changes to localStorage
  useEffect(() => {
    db.set('empresa', companySettings);
  }, [companySettings]);

  useEffect(() => {
    db.set('banco', bankSettings);
  }, [bankSettings]);

  useEffect(() => {
    db.set('marketing', marketingSettings);
  }, [marketingSettings]);

  useEffect(() => {
    db.set('instrutores', instructors);
  }, [instructors]);

  useEffect(() => {
    db.set('agendamentos', bookings);
  }, [bookings]);

  useEffect(() => {
    if (currentUser) {
      db.set('usuarioLogado', currentUser);
    }
  }, [currentUser]);

  // Global window bindings for switchSystem, showView, and window.app
  useEffect(() => {
    const switchSystem = (mode: string) => {
      if (mode === 'cliente' || mode === 'admin') {
        setPortalMode(mode as PortalMode);
      }
    };

    const showView = (id: string) => {
      if (id === 'c-login') {
        setPortalMode('cliente');
        setClientScreen('login');
      } else if (id === 'c-cadastro') {
        setPortalMode('cliente');
        setClientScreen('cadastro');
      } else if (id === 'c-main') {
        setPortalMode('cliente');
        setClientScreen('main');
      } else if (id === 'a-login') {
        setPortalMode('admin');
        setAdminScreen('a-login');
      } else if (id === 'a-dashboard') {
        setPortalMode('admin');
        setAdminScreen('a-dashboard');
      }
    };

    const win = window as unknown as Record<string, unknown>;
    win.switchSystem = switchSystem;
    win.switchMode = switchSystem;
    win.showView = showView;
    win.show = showView;

    win.app = {
      loginCliente: (e?: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        const emailEl = document.getElementById('l-email') as HTMLInputElement;
        const email = emailEl?.value || 'atirador@clube.com';
        handleLoginSuccess({
          name: email.split('@')[0].toUpperCase(),
          email: email,
          cpf: '123.456.789-00',
          phone: '(11) 98765-4321',
          referredByStore: 'Nenhuma / Direto',
          crNumber: 'CR-' + Math.floor(100000 + Math.random() * 900000),
          crValidity: '12/2028',
        });
      },
      cadastrarCliente: (e?: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        const nome = (document.getElementById('cad-nome') as HTMLInputElement)?.value || 'Novo Atirador';
        const email = (document.getElementById('cad-email') as HTMLInputElement)?.value || '';
        const cpf = (document.getElementById('cad-cpf') as HTMLInputElement)?.value || '123.456.789-00';
        const tel = (document.getElementById('cad-tel') as HTMLInputElement)?.value || '(11) 99999-9999';
        const loja = (document.getElementById('cad-loja') as HTMLSelectElement)?.value || 'Direto';
        const pwd = (document.getElementById('cad-senha') as HTMLInputElement)?.value || '123';

        const userEmail = email.trim() || cpf.replace(/\D/g, '') || `user_${Date.now()}`;

        const newUser: UserProfile = {
          name: nome,
          email: userEmail,
          cpf,
          phone: tel,
          referredByStore: loja,
          crNumber: 'CR-' + Math.floor(100000 + Math.random() * 900000),
          crValidity: '12/2028',
          password: pwd,
        };
        handleRegisterSuccess(newUser);
        alert(`Cadastro realizado com sucesso!\nPara entrar use:\nLogin: ${newUser.email}\nSenha: ${newUser.password}`);
      },
      criarAgendamento: (e?: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        const data = (document.getElementById('ag-data') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];
        const turno = (document.getElementById('ag-turno') as HTMLSelectElement)?.value || 'Manhã (08:00 às 12:00)';
        
        const newBooking: Booking = {
          id: `b-${Date.now().toString().slice(-4)}`,
          userName: currentUser?.name || 'Atirador Cadastrado',
          userEmail: currentUser?.email,
          lojaIndicou: currentUser?.referredByStore || 'Nenhuma / Direto',
          date: data,
          shift: turno,
          status: 'Aguardando Confirmação',
          createdAt: new Date().toISOString().split('T')[0],
        };
        handleAddBooking(newBooking);
        alert('Agendamento enviado ao administrador com os dados de sua indicação!');
      },
      solicitarCancelamento: (id: string) => {
        handleCancelBooking(id);
      },
      carregarTelaCliente: () => {
        setPortalMode('cliente');
        setClientScreen('main');
      },
      logout: () => {
        handleLogout();
      },
      loginAdmin: (e?: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        handleAdminLoginSuccess();
      },
      salvarConfig: () => {
        const empEl = document.getElementById('adm-empresa') as HTMLInputElement;
        if (empEl && empEl.value) {
          const newSettings = { ...companySettings, name: empEl.value };
          setCompanySettings(newSettings);
          saveCompanySettingsInDb(newSettings);
          alert('Nome da empresa salvo com sucesso!');
        }
      },
      uploadLogoEmpresa: () => {
        const fileInput = document.getElementById('adm-logo-file') as HTMLInputElement;
        const statusEl = document.getElementById('logo-status');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              const empEl = document.getElementById('adm-empresa') as HTMLInputElement;
              const newName = empEl?.value || companySettings.name || 'WM TREINAMENTOS';
              const newSettings = { ...companySettings, name: newName, logoUrl: dataUrl };
              setCompanySettings(newSettings);
              saveCompanySettingsInDb(newSettings);
              if (statusEl) statusEl.innerText = '✓ Logotipo atualizado com sucesso!';
              alert('Logotipo atualizado com sucesso!');
            }
          };
          reader.readAsDataURL(file);
        } else {
          if (statusEl) statusEl.innerText = '⚠️ Selecione um arquivo de imagem para o logo.';
          alert('Selecione uma imagem do logotipo primeiro.');
        }
      },
      cadastrarInstrutor: (e?: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        const nome = (document.getElementById('inst-nome') as HTMLInputElement)?.value || 'Instrutor Silva';
        const iat = (document.getElementById('inst-iat') as HTMLInputElement)?.value || 'IAT-1234';
        const newInst = { id: `inst-${Date.now()}`, name: nome, iatNumber: iat };
        setInstructors((prev) => [...prev, newInst]);
        addInstructorInDb(newInst);
        alert('Instrutor cadastrado com sucesso!');
      },
      excluirInstrutor: (id: string) => {
        handleDeleteInstructor(id);
      },
      excluirAgendamento: (id: string) => {
        handleDeleteBooking(id);
      },
      salvarBanco: () => {
        const pix = (document.getElementById('adm-pix') as HTMLInputElement)?.value || 'pix@clube.com';
        const nome = (document.getElementById('adm-pix-nome') as HTMLInputElement)?.value || 'WM TREINAMENTOS';
        const cidade = (document.getElementById('adm-pix-cidade') as HTMLInputElement)?.value || 'PALMAS';
        const banco = (document.getElementById('adm-banco') as HTMLInputElement)?.value || 'Banco do Brasil';
        const agencia = (document.getElementById('adm-agencia-conta') as HTMLInputElement)?.value || 'Ag: 0001 Conta: 12345-6';

        const newBank = {
          ...bankSettings,
          pixKey: pix,
          pixName: nome,
          pixCity: cidade,
          bank: banco,
          agencyAccount: agencia
        };
        setBankSettings(newBank);
        saveBankSettingsInDb(newBank);
        alert('Dados bancários salvos com sucesso!');
      },
      uploadQRCodeGaleria: () => {
        const fileInput = document.getElementById('adm-pix-file') as HTMLInputElement;
        const statusEl = document.getElementById('pix-status');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              const pix = (document.getElementById('adm-pix') as HTMLInputElement)?.value || bankSettings.pixKey || 'pix@clube.com';
              const nome = (document.getElementById('adm-pix-nome') as HTMLInputElement)?.value || bankSettings.pixName || 'WM TREINAMENTOS';
              const cidade = (document.getElementById('adm-pix-cidade') as HTMLInputElement)?.value || bankSettings.pixCity || 'PALMAS';
              
              const newBank = { 
                ...bankSettings, 
                pixKey: pix,
                pixName: nome,
                pixCity: cidade,
                qrcodeUrl: dataUrl 
              };
              setBankSettings(newBank);
              saveBankSettingsInDb(newBank);
              if (statusEl) statusEl.innerText = '✓ QR Code enviado e atualizado com sucesso!';
              alert('Imagem do QR Code enviada com sucesso!');
            }
          };
          reader.readAsDataURL(file);
        } else {
          if (statusEl) statusEl.innerText = '⚠️ Selecione um arquivo de imagem primeiro.';
          alert('Selecione uma imagem do QR Code da galeria antes de enviar.');
        }
      },
      gerarEEnviarQRCode: () => {
        const pix = (document.getElementById('adm-pix') as HTMLInputElement)?.value || 'pix@clube.com';
        const nome = (document.getElementById('adm-pix-nome') as HTMLInputElement)?.value || 'WM TREINAMENTOS';
        const cidade = (document.getElementById('adm-pix-cidade') as HTMLInputElement)?.value || 'PALMAS';
        const banco = (document.getElementById('adm-banco') as HTMLInputElement)?.value || 'Banco do Brasil';
        
        const newBank = {
          ...bankSettings,
          pixKey: pix,
          pixName: nome,
          pixCity: cidade,
          bank: banco
        };
        setBankSettings(newBank);
        saveBankSettingsInDb(newBank);
      },
      publicarMarketing: () => {
        const promo = (document.getElementById('adm-txt-promo') as HTMLTextAreaElement)?.value || marketingSettings.bannerText;
        const avisos = (document.getElementById('adm-txt-avisos') as HTMLTextAreaElement)?.value || marketingSettings.noticesText;
        const newMkt = { bannerText: promo, noticesText: avisos };
        setMarketingSettings(newMkt);
        saveMarketingSettingsInDb(newMkt);
        alert('Conteúdo publicado com sucesso!');
      }
    };
  }, [currentUser, marketingSettings, bankSettings]);

  const handleSelectPortalMode = (mode: PortalMode) => {
    setPortalMode(mode);
  };

  const handleLoginSuccess = (userProfile: UserProfile) => {
    setCurrentUser(userProfile);
    saveClientInDb(userProfile);
    setClientScreen('main');
  };

  const handleRegisterSuccess = (newUser: UserProfile) => {
    saveClientInDb(newUser);
    setCurrentUser(null);
    localStorage.removeItem('usuarioLogado');
    setClientScreen('login');
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setAdminScreen('a-dashboard');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminScreen('a-login');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('usuarioLogado');
    setClientScreen('login');
  };

  const handleAddBooking = (newBooking: Booking) => {
    setBookings((prev) => [newBooking, ...prev]);
    createBookingInDb(newBooking);
  };

  const handleCancelBooking = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Cancelamento Solicitado' } : b))
    );
    updateBookingStatusInDb(id, 'Cancelamento Solicitado');
  };

  const handleUpdateBookingStatus = (
    id: string, 
    status: 'Confirmado' | 'Aprovado' | 'Cancelado' | 'Pendente' | string,
    bookingDetails?: Booking,
    adminNote?: string
  ) => {
    const target = bookingDetails || bookings.find((b) => b.id === id);
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status, adminNote, updatedAt: new Date().toISOString() } : b))
    );
    updateBookingStatusInDb(id, status, target, adminNote);
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markNotificationAsReadInDb(id);
  };

  const handleMarkAllNotificationsAsRead = (ids: string[]) => {
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    markAllNotificationsAsReadInDb(ids);
  };

  const handleDeleteBooking = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    deleteBookingFromDb(id);
  };

  const handleDeleteInstructor = (id: string) => {
    setInstructors((prev) => prev.filter((i) => i.id !== id));
    deleteInstructorFromDb(id);
  };

  const handleDeleteClient = (clientOrId: string | UserProfile) => {
    const targetId = typeof clientOrId === 'string' ? clientOrId : (clientOrId.id || clientOrId.email || '');
    setRegisteredClients((prev) => prev.filter((c) => c.id !== targetId && c.email !== targetId));
    deleteClientFromDb(clientOrId);
  };

  return (
    <div className="min-h-screen bg-[#0d120c] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Navigation */}
      <HeaderNav
        portalMode={portalMode}
        onSelectPortalMode={handleSelectPortalMode}
        clientScreen={clientScreen}
        onNavigateClient={(s) => {
          if (s === 'main' && !currentUser) {
            setClientScreen('login');
          } else {
            setClientScreen(s);
          }
        }}
        adminScreen={adminScreen}
        onNavigateAdmin={(s) => setAdminScreen(s)}
        currentUser={currentUser}
        onLogout={handleLogout}
        companyName={companySettings.name}
        logoUrl={companySettings.logoUrl}
        unreadNotificationCount={notifications.filter((n) => !n.read).length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pb-12">
        {/* PORTAL DO CLIENTE */}
        {portalMode === 'cliente' && (
          <div id="wrapper-cliente">
            {/* TELA DE LOGIN CLIENTE */}
            {clientScreen === 'login' && (
              <LoginCard
                onLoginSuccess={handleLoginSuccess}
                onGoToCadastro={() => setClientScreen('cadastro')}
              />
            )}

            {/* TELA DE CADASTRO CLIENTE */}
            {clientScreen === 'cadastro' && (
              <CadastroCard
                onRegisterSuccess={handleRegisterSuccess}
                onGoToLogin={() => setClientScreen('login')}
              />
            )}

            {/* TELA PRINCIPAL CLIENTE (Exigida autenticação) */}
            {clientScreen === 'main' && currentUser && (
              <MainClientArea 
                currentUser={currentUser}
                marketingSettings={marketingSettings}
                bankSettings={bankSettings}
                bookings={bookings}
                bookingHistory={bookingHistory}
                blockedSlots={blockedSlots}
                notifications={notifications}
                onMarkNotificationAsRead={handleMarkNotificationAsRead}
                onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
                onAddBooking={handleAddBooking}
                onCancelBooking={handleCancelBooking}
                onLogout={handleLogout}
              />
            )}

            {clientScreen === 'main' && !currentUser && (
              <LoginCard
                onLoginSuccess={handleLoginSuccess}
                onGoToCadastro={() => setClientScreen('cadastro')}
              />
            )}
          </div>
        )}

        {/* PAINEL ADMINISTRATIVO */}
        {portalMode === 'admin' && (
          <div id="wrapper-admin">
            {/* TELA DE LOGIN ADMIN */}
            {(!isAdminLoggedIn || adminScreen === 'a-login') && (
              <AdminLoginCard
                onLoginSuccess={handleAdminLoginSuccess}
                adminPassword={adminPassword}
              />
            )}

            {/* PAINEL DE CONTROLE ADMIN */}
            {isAdminLoggedIn && adminScreen === 'a-dashboard' && (
              <AdminDashboard
                companySettings={companySettings}
                onUpdateCompanySettings={(s) => {
                  setCompanySettings(s);
                  saveCompanySettingsInDb(s);
                }}
                bankSettings={bankSettings}
                onUpdateBankSettings={(s) => {
                  setBankSettings(s);
                  saveBankSettingsInDb(s);
                }}
                marketingSettings={marketingSettings}
                onUpdateMarketingSettings={(s) => {
                  setMarketingSettings(s);
                  saveMarketingSettingsInDb(s);
                }}
                instructors={instructors}
                onAddInstructor={(inst) => {
                  setInstructors((prev) => [...prev, inst]);
                  addInstructorInDb(inst);
                }}
                onDeleteInstructor={handleDeleteInstructor}
                bookings={bookings}
                bookingHistory={bookingHistory}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onDeleteBooking={handleDeleteBooking}
                clients={registeredClients}
                onDeleteClient={handleDeleteClient}
                blockedSlots={blockedSlots}
                onUpdateBlockedSlots={(slots) => {
                  setBlockedSlots(slots);
                  updateScheduleSettings(slots);
                }}
                adminPassword={adminPassword}
                onUpdateAdminPassword={(newPassword) => {
                  setAdminPassword(newPassword);
                  db.set('adminPassword', newPassword);
                  saveAdminCredentialsInDb({ password: newPassword });
                }}
                onAdminLogout={handleAdminLogout}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#080c07] text-slate-400 py-6 text-center text-xs border-t border-[#23311f] mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} {companySettings.name}. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span className="text-emerald-500 font-semibold">Área Segura</span>
            <span>•</span>
            <span className="text-orange-400 font-semibold">Atendimento Restrito a Atiradores</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

