import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Check, 
  X, 
  Clock, 
  Calendar, 
  Volume2, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import { ClientNotification, Booking, UserProfile } from '../types';
import { 
  isPushNotificationSupported, 
  getPushNotificationPermission, 
  requestPushNotificationPermission, 
  sendBrowserPushNotification, 
  playNotificationSound 
} from '../lib/notificationUtils';

interface ClientNotificationCenterProps {
  currentUser: UserProfile | null;
  notifications: ClientNotification[];
  bookings: Booking[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (ids: string[]) => void;
}

export const ClientNotificationCenter: React.FC<ClientNotificationCenterProps> = ({
  currentUser,
  notifications,
  bookings,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [toastAlert, setToastAlert] = useState<{
    id: string;
    title: string;
    message: string;
    status: string;
    date: string;
    shift: string;
    note?: string;
  } | null>(null);

  // Keep track of previous bookings map to detect immediate real-time status transitions
  const prevBookingsRef = useRef<Map<string, string>>(new Map());
  const initialLoadRef = useRef(true);

  // Initialize push notification permission state
  useEffect(() => {
    setPushPermission(getPushNotificationPermission());
  }, []);

  // Monitor bookings for real-time status changes and fire audio chime + toast + push
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;

    if (initialLoadRef.current) {
      // First load, populate previous bookings map without firing alerts
      bookings.forEach((b) => {
        prevBookingsRef.current.set(b.id, b.status);
      });
      initialLoadRef.current = false;
      return;
    }

    bookings.forEach((b) => {
      // Only process bookings belonging to current user
      const isUserBooking = !currentUser || !b.userName || 
        (currentUser.name && b.userName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
        (currentUser.email && b.userEmail?.toLowerCase() === currentUser.email.toLowerCase());

      if (!isUserBooking) return;

      const previousStatus = prevBookingsRef.current.get(b.id);
      if (previousStatus && previousStatus !== b.status) {
        // Status CHANGED in real time!
        const statusClean = b.status || 'Atualizado';

        // 1. Play auditory chime
        playNotificationSound();

        // 2. Trigger native browser push notification if permission granted
        if (getPushNotificationPermission() === 'granted') {
          sendBrowserPushNotification(`🎯 Agendamento ${statusClean}!`, {
            body: `Seu agendamento para ${b.date} (${b.shift}) foi marcado como "${statusClean}" pelo administrador.`,
          });
        }

        // 3. Show prominent floating toast alert
        setToastAlert({
          id: b.id,
          title: `Agendamento ${statusClean}!`,
          message: `O administrador atualizou o status para "${statusClean}".`,
          status: statusClean,
          date: b.date,
          shift: b.shift,
          note: b.adminNote,
        });

        // Auto-dismiss toast after 8 seconds
        setTimeout(() => {
          setToastAlert((curr) => (curr?.id === b.id ? null : curr));
        }, 8000);
      }

      // Update ref
      prevBookingsRef.current.set(b.id, b.status);
    });
  }, [bookings, currentUser]);

  const handleRequestPush = async () => {
    const res = await requestPushNotificationPermission();
    setPushPermission(res);
    if (res === 'granted') {
      playNotificationSound();
      sendBrowserPushNotification('🔔 Notificações Ativadas com Sucesso!', {
        body: 'Você receberá alertas sempre que seu agendamento for confirmado ou alterado pelo administrador.',
      });
      alert('✓ Notificações do navegador ativadas com sucesso! Você receberá avisos em tempo real.');
    } else if (res === 'denied') {
      alert('⚠️ As notificações foram bloqueadas no seu navegador. Você pode habilitá-las nas configurações do site no seu navegador.');
    }
  };

  const handleTestPushAndSound = () => {
    playNotificationSound();
    if (isPushNotificationSupported() && Notification.permission === 'granted') {
      sendBrowserPushNotification('🎯 Teste de Notificação Push - Clube', {
        body: 'Notificações push e sonoras estão 100% operacionais no seu dispositivo!',
      });
    }

    setToastAlert({
      id: `test-${Date.now()}`,
      title: 'Teste de Alerta Visual e Sonoro!',
      message: 'Este é um exemplo de como você será alertado quando o administrador aprovar ou alterar seu horário.',
      status: 'Confirmado',
      date: new Date().toLocaleDateString('pt-BR'),
      shift: 'Manhã (08:00 às 12:00)',
      note: 'Instalação e linha de tiro preparadas para o seu treino.',
    });
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;

  // Find most recent unread notification to highlight in the top banner
  const latestUnread = unreadNotifications[0] || null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTimestamp = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' de ' + d.toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('confirm') || s.includes('aprov')) {
      return {
        bg: 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
        label: 'Confirmado',
      };
    }
    if (s.includes('cancel')) {
      return {
        bg: 'bg-red-950/90 text-red-300 border-red-700/80',
        icon: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
        label: 'Cancelado',
      };
    }
    return {
      bg: 'bg-orange-950/90 text-orange-300 border-orange-700/80',
      icon: <Clock className="w-4 h-4 text-orange-400 shrink-0" />,
      label: status || 'Pendente',
    };
  };

  return (
    <div className="space-y-4 mb-6">
      {/* 1. BARRA SUPERIOR DE CONTROLE DE NOTIFICAÇÕES & SINO */}
      <div className="bg-[#0e140d] border border-[#2d3e28] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                unreadCount > 0
                  ? 'bg-orange-600/30 border-orange-500/80 text-orange-300 animate-pulse'
                  : 'bg-[#182216] border-[#31442c] text-slate-300 hover:text-white'
              }`}
              title="Abrir Central de Notificações"
            >
              <Bell className="w-4 h-4" />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-[#0e140d] animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Alertas e Notificações de Agendamentos</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-600/50 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} {unreadCount === 1 ? 'novo alerta' : 'novos alertas'}
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-400">
              Receba avisos instantâneos quando o administrador confirmar ou alterar seu horário
            </p>
          </div>
        </div>

        {/* Botoes de Acao de Notificacao Push */}
        <div className="flex items-center gap-2 flex-wrap">
          {pushPermission === 'granted' ? (
            <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold px-2.5 py-1 rounded-lg">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Push Ativo no Navegador
            </span>
          ) : pushPermission === 'unsupported' ? (
            <span className="text-[11px] text-slate-500 italic">Notificações push não suportadas neste navegador</span>
          ) : (
            <button
              onClick={handleRequestPush}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ativar Notificações do Navegador</span>
            </button>
          )}

          <button
            onClick={handleTestPushAndSound}
            className="bg-[#1b2719] hover:bg-[#263723] text-slate-200 border border-[#31452c] text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Tocar som e exibir teste de alerta"
          >
            <Volume2 className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Testar Alerta & Som</span>
          </button>
        </div>
      </div>

      {/* 2. BANNER DE ALERTA VISUAL EM DESTAQUE (Aparece quando há atualização não lida) */}
      {latestUnread && (
        <div
          className={`p-4 rounded-xl border shadow-xl transition-all relative overflow-hidden ${
            latestUnread.newStatus.toLowerCase().includes('cancel')
              ? 'bg-gradient-to-r from-red-950/90 via-[#260e0e] to-red-950/90 border-red-700/80 text-red-100 ring-2 ring-red-600/30'
              : 'bg-gradient-to-r from-emerald-950/90 via-[#0e2413] to-emerald-950/90 border-emerald-600/80 text-emerald-100 ring-2 ring-emerald-500/30'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 border ${
                  latestUnread.newStatus.toLowerCase().includes('cancel')
                    ? 'bg-red-900/60 border-red-700 text-red-300'
                    : 'bg-emerald-900/60 border-emerald-600 text-emerald-300'
                }`}
              >
                {latestUnread.newStatus.toLowerCase().includes('cancel') ? (
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm uppercase tracking-wide text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    Status do Agendamento Atualizado pelo Administrador!
                  </span>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                      getStatusBadgeStyle(latestUnread.newStatus).bg
                    }`}
                  >
                    {latestUnread.newStatus}
                  </span>
                </div>

                <p className="text-xs text-slate-200">
                  Seu agendamento para o dia{' '}
                  <strong className="text-white underline">{formatDate(latestUnread.date)}</strong> no turno{' '}
                  <strong className="text-white">{latestUnread.shift}</strong> foi{' '}
                  <strong className="text-orange-300">{latestUnread.newStatus.toUpperCase()}</strong>.
                </p>

                {latestUnread.adminNote && (
                  <div className="text-xs bg-[#0a110a]/80 p-2.5 rounded-lg border border-[#2d4029] text-slate-200 mt-2">
                    <span className="font-bold text-orange-400">Observação do Administrador / Instrutor:</span>{' '}
                    <span>{latestUnread.adminNote}</span>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 pt-1">
                  Atualizado em: {formatTimestamp(latestUnread.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onMarkAsRead(latestUnread.id)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-white/20 transition-all flex items-center gap-1 cursor-pointer"
                title="Marcar como lida"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Entendido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL / DROPDOWN DA CENTRAL DE NOTIFICAÇÕES */}
      {isOpen && (
        <div className="bg-[#0e140d] border border-[#2d3e28] rounded-xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#243521] pb-2.5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              <h3 className="font-bold text-sm text-white">Histórico de Alertas de Agendamentos</h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => onMarkAllAsRead(unreadNotifications.map((n) => n.id))}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Nenhuma notificação registrada até o momento.
              </p>
            ) : (
              notifications.map((notif) => {
                const badge = getStatusBadgeStyle(notif.newStatus);
                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      !notif.read
                        ? 'bg-[#1a2517] border-orange-500/50 shadow-md ring-1 ring-orange-500/20'
                        : 'bg-[#131c12] border-[#253621] opacity-80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {badge.icon}
                        <span className="font-bold text-white">Status alterado para:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badge.bg}`}>
                          {notif.newStatus}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                        )}
                      </div>

                      <div className="text-slate-300">
                        <strong>Data:</strong> {formatDate(notif.date)} - <strong>Turno:</strong> {notif.shift}
                      </div>

                      {notif.adminNote && (
                        <div className="text-[11px] text-orange-300/90 italic">
                          "{notif.adminNote}"
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400">
                        {formatTimestamp(notif.createdAt)}
                      </div>
                    </div>

                    {!notif.read && (
                      <button
                        onClick={() => onMarkAsRead(notif.id)}
                        className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold px-2 py-1 rounded border border-emerald-500/40 transition-colors flex items-center gap-1 cursor-pointer self-start sm:self-center"
                      >
                        <Check className="w-3 h-3" />
                        <span>Marcar como lida</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. TOAST FLUTUANTE EM TEMPO REAL (Floating Pop-up Alert no canto da tela) */}
      {toastAlert && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-[#0d160c] border-2 border-emerald-500 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 space-y-2 ring-4 ring-emerald-500/20">
          <div className="flex items-start justify-between gap-2 border-b border-[#253822] pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/40">
                <Bell className="w-4 h-4 animate-bounce" />
              </span>
              <h5 className="font-extrabold text-sm text-emerald-300">{toastAlert.title}</h5>
            </div>
            <button
              onClick={() => setToastAlert(null)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-200">
            {toastAlert.message}
          </p>

          <div className="bg-[#172315] p-2 rounded text-xs text-slate-300 border border-[#2b3e27]">
            <div><strong>Data:</strong> {formatDate(toastAlert.date)}</div>
            <div><strong>Horário:</strong> {toastAlert.shift}</div>
            {toastAlert.note && (
              <div className="text-orange-300 font-medium mt-1">Obs: {toastAlert.note}</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setToastAlert(null);
                setIsOpen(true);
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded transition-colors cursor-pointer"
            >
              Ver Notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
