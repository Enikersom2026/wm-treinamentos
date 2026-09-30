import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  PlusCircle, 
  Copy,
  Check,
  Store,
  QrCode,
  Landmark,
  CheckCircle2,
  Send,
  Bell,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Booking, UserProfile, MarketingSettings, BankSettings, ClientNotification } from '../types';
import { BannerCarousel } from './BannerCarousel';
import { ClientNotificationCenter } from './ClientNotificationCenter';
import { generatePixPayload } from '../lib/pixUtils';

interface MainClientAreaProps {
  currentUser: UserProfile | null;
  marketingSettings?: MarketingSettings;
  bankSettings?: BankSettings;
  bookings?: Booking[];
  bookingHistory?: Booking[];
  blockedSlots?: string[];
  notifications?: ClientNotification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: (ids: string[]) => void;
  onAddBooking?: (booking: Booking) => void;
  onCancelBooking?: (id: string) => void;
  onLogout?: () => void;
}

export const MainClientArea: React.FC<MainClientAreaProps> = ({ 
  currentUser,
  marketingSettings,
  bankSettings,
  bookings: propBookings,
  bookingHistory = [],
  blockedSlots = [],
  notifications = [],
  onMarkNotificationAsRead = () => {},
  onMarkAllNotificationsAsRead = () => {},
  onAddBooking,
  onCancelBooking,
  onLogout,
}) => {
  // Local bookings fallback state if not passed from parent
  const [localBookings, setLocalBookings] = useState<Booking[]>([
    {
      id: 'b-101',
      userName: currentUser?.name || 'Atirador',
      date: '2026-10-25',
      shift: 'Tarde (13:00 às 18:00)',
      status: 'Confirmado',
      createdAt: '2026-07-20',
    },
  ]);

  const activeBookings = propBookings || localBookings;

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [inputLojaIndicou, setInputLojaIndicou] = useState(currentUser?.referredByStore || '');
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [paymentNotified, setPaymentNotified] = useState(false);
  const [courseRegistered, setCourseRegistered] = useState(false);
  const [qrImgError, setQrImgError] = useState(false);

  const pixKeyToDisplay = bankSettings?.pixKey || 'pix@clube.com';
  const pixName = bankSettings?.pixName || 'WM TREINAMENTOS';
  const pixCity = bankSettings?.pixCity || 'PALMAS';
  const bankName = bankSettings?.bank || 'Banco do Brasil';
  const agencyAcc = bankSettings?.agencyAccount || 'Ag: 0001 Conta: 12345-6';

  const pixPayload = generatePixPayload(pixKeyToDisplay, pixName, pixCity);

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixKeyToDisplay);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const copyPixPayload = () => {
    navigator.clipboard.writeText(pixPayload || pixKeyToDisplay);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const handleNotifyPayment = () => {
    setPaymentNotified(true);
    alert('Notificação de pagamento enviada ao administrador! Aguarde a confirmação do comprovante.');
  };

  // Generate 10-minute interval slots respecting lunch break
  const morningSlots: string[] = [];
  for (let h = 7; h <= 12; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 12 && m > 0) break;
      morningSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  const afternoonSlots: string[] = [];
  for (let h = 13; h <= 21; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 21 && m > 0) break;
      afternoonSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  // Check if slot is explicitly blocked by admin settings
  const isSlotBlockedByAdmin = (slotValue: string, timeLabel?: string) => {
    if (!blockedSlots || blockedSlots.length === 0) return false;

    // 1. Direct exact match on slotValue (e.g. "Manhã (08:00)" or "Manhã (08:00 às 12:00)")
    if (blockedSlots.includes(slotValue)) return true;

    // 2. Check exact timeLabel match if passed
    if (timeLabel) {
      if (blockedSlots.includes(timeLabel)) return true;
      if (blockedSlots.includes(`Manhã (${timeLabel})`) || blockedSlots.includes(`Tarde/Noite (${timeLabel})`)) {
        return true;
      }
    }

    // 3. Check overarching shift period blocks ONLY if general period is explicitly present
    if (slotValue.startsWith('Manhã (') && !slotValue.includes('às')) {
      if (blockedSlots.includes("Manhã (08:00 às 12:00)")) return true;
    }

    if (slotValue.startsWith('Tarde/Noite (') && timeLabel) {
      const hour = parseInt(timeLabel.split(':')[0], 10);
      if (hour >= 13 && hour < 18 && blockedSlots.includes("Tarde (13:00 às 18:00)")) return true;
      if (hour >= 18 && blockedSlots.includes("Noite (18:00 às 21:00)")) return true;
    }

    return false;
  };

  // Check if a time slot or shift is already booked or blocked by admin
  const isSlotOccupied = (slotValue: string, timeLabel?: string) => {
    if (isSlotBlockedByAdmin(slotValue, timeLabel)) return true;
    if (!selectedDate) return false;
    return activeBookings.some((b) => {
      if (b.date !== selectedDate) return false;
      const status = (b.status || '').toLowerCase();
      if (status.includes('cancel')) return false;

      if (b.shift === slotValue) return true;
      if (timeLabel && b.shift?.includes(timeLabel)) return true;
      if (b.shift && slotValue && (b.shift.includes(slotValue) || slotValue.includes(b.shift))) return true;

      return false;
    });
  };

  // Handle booking form submission
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedShift) {
      alert('Por favor, selecione a data e o horário desejado.');
      return;
    }

    if (isSlotOccupied(selectedShift)) {
      alert(`⛔ O horário "${selectedShift}" já está INDISPONÍVEL para o dia ${formatDateDisplay(selectedDate)}! Por favor, escolha outro horário.`);
      return;
    }

    const newBooking: Booking = {
      id: `b-${Date.now().toString().slice(-4)}`,
      userName: currentUser?.name || 'Atirador Cadastrado',
      userEmail: currentUser?.email,
      lojaIndicou: inputLojaIndicou.trim() || currentUser?.referredByStore || 'Nenhuma / Direto',
      date: selectedDate,
      shift: selectedShift,
      status: 'Aguardando Confirmação',
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (onAddBooking) {
      onAddBooking(newBooking);
    } else {
      setLocalBookings([newBooking, ...localBookings]);
    }

    alert('Agendamento enviado ao administrador com sucesso!');
    setSelectedDate('');
    setSelectedShift('');
    setInputLojaIndicou('');
  };

  // Handle booking cancellation
  const handleCancelBooking = (id: string) => {
    if (onCancelBooking) {
      onCancelBooking(id);
    } else {
      setLocalBookings(
        localBookings.map((b) => (b.id === id ? { ...b, status: 'Cancelamento Solicitado' } : b))
      );
    }
    alert('Solicitação de cancelamento enviada ao administrador.');
  };

  // Format date helper (YYYY-MM-DD or YYYY/MM/DD to DD/MM/YYYY)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3 && (parts[0].length === 4 || parseInt(parts[0]) > 31)) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  const copyCouponCode = () => {
    navigator.clipboard.writeText('PROMO15');
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  const bannerTextToDisplay = marketingSettings?.bannerText !== undefined && marketingSettings.bannerText !== null && marketingSettings.bannerText !== ''
    ? marketingSettings.bannerText 
    : '🎯 PROMOÇÃO DA SEMANA: 15% OFF em munição recarregada de 9mm! Use o cupom PROMO15 no balcão.';

  const noticesTextToDisplay = marketingSettings?.noticesText;

  return (
    <div id="c-main" className="bg-[#182216] text-slate-100 rounded-xl shadow-2xl border border-[#2d3e28] p-6 md:p-8 max-w-xl mx-auto my-6 transition-all">
      {/* Informações do Atirador & Loja Indicante */}
      {currentUser && (
        <div className="bg-[#0e140d] text-white p-4 rounded-xl mb-4 shadow-md border border-[#2a3c26] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase font-semibold">Atirador Cadastrado:</span>
              <span className="text-sm font-bold text-white">{currentUser.name}</span>
            </div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">E-mail:</span> {currentUser.email}
            </div>
          </div>

          <div className="bg-[#1c281a] px-3 py-2 rounded-lg border border-[#2e422b] shrink-0 w-full sm:w-auto">
            <div className="text-[10px] uppercase tracking-wider text-orange-400 font-bold flex items-center gap-1">
              <Store className="w-3.5 h-3.5" />
              <span>Loja que Indicou:</span>
            </div>
            <div className="text-xs font-bold text-slate-100 mt-0.5">
              {currentUser.referredByStore || 'Nenhuma / Direto'}
            </div>
          </div>
        </div>
      )}

      {/* CENTRAL DE NOTIFICAÇÕES & ALERTAS VISUAIS DE STATUS */}
      <ClientNotificationCenter
        currentUser={currentUser}
        notifications={notifications}
        bookings={activeBookings}
        onMarkAsRead={onMarkNotificationAsRead}
        onMarkAllAsRead={onMarkAllNotificationsAsRead}
      />

      {/* Carrossel de Banners com Transição Automática a cada 3 Segundos */}
      <BannerCarousel 
        bannerText={bannerTextToDisplay} 
        noticesText={noticesTextToDisplay}
        images={marketingSettings?.bannerImages} 
      />

      {/* Área de Pagamento PIX com QR Code */}
      <div id="c-pagamento-pix" className="bg-[#0e140d] text-white rounded-xl p-5 mb-6 shadow-xl border border-[#2a3c26] space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a3c26] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
                <span>Área de Pagamento PIX</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Escaneie o QR Code ou copie a chave cadastrada para efetuar o pagamento
              </p>
            </div>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold px-2 py-1 rounded border border-emerald-500/30 shrink-0">
            PIX Oficial
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 bg-[#172315] p-4 rounded-xl border border-[#2e422b]">
          {/* QR Code Generated Canvas / Image */}
          <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200 shrink-0 flex flex-col items-center">
            {bankSettings?.qrcodeUrl && !bankSettings.qrcodeUrl.includes('qrserver.com') && !qrImgError ? (
              <img 
                id="img-c-qrcode"
                src={bankSettings.qrcodeUrl} 
                alt="QR Code PIX" 
                className="w-36 h-36 object-contain rounded"
                onError={() => setQrImgError(true)}
              />
            ) : (
              <QRCodeSVG 
                value={pixPayload || pixKeyToDisplay} 
                size={140}
                level="H"
                includeMargin={false}
              />
            )}
            <span className="text-[10px] text-slate-600 font-semibold mt-1.5 uppercase tracking-wider">Aponte a câmera</span>
          </div>

          {/* Pix Key Details */}
          <div className="space-y-3 w-full text-center sm:text-left">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Chave PIX do Clube</span>
                <button
                  type="button"
                  id="btn-copiar-chave-top"
                  onClick={copyPixKey}
                  className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer transition-colors bg-[#080d07] px-2 py-0.5 rounded border border-[#2a3c26]"
                  title="Copiar Chave PIX"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-orange-400" />
                      <span>Copiar Chave PIX</span>
                    </>
                  )}
                </button>
              </div>

              <div 
                id="box-chave-pix-copiar"
                onClick={copyPixKey}
                title="Clique para copiar a chave PIX"
                className="bg-[#080d07] hover:bg-[#101a0e] px-3 py-2.5 rounded-lg border border-[#2a3c26] hover:border-orange-500/50 text-emerald-400 font-mono text-xs sm:text-sm font-bold truncate flex items-center justify-between gap-2 cursor-pointer transition-all group"
              >
                <span className="truncate select-all">{pixKeyToDisplay}</span>
                <span className="shrink-0 text-[10px] bg-orange-500/20 group-hover:bg-orange-500/30 text-orange-300 font-semibold px-2 py-0.5 rounded border border-orange-500/40 flex items-center gap-1">
                  {copiedPix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-orange-400" />}
                  {copiedPix ? 'Copiada!' : 'Copiar Chave'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 bg-[#080d07]/60 px-3 py-1.5 rounded border border-[#23321f]">
              <span className="text-slate-400 text-[11px] font-medium">{bankName}</span>
              <span className="text-slate-400 text-[11px] font-medium">{agencyAcc}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={copyPixKey}
                className="py-2 px-3 bg-[#243521] hover:bg-[#2e432b] active:bg-[#1a2718] text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#374f33]"
              >
                {copiedPix ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Chave Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-orange-400" />
                    <span>Copiar Chave</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={copyPixPayload}
                className="py-2 px-3 bg-[#1d3319] hover:bg-[#274522] active:bg-[#142411] text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#305429]"
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">PIX Copia e Cola OK!</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PIX Copia e Cola</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleNotifyPayment}
              disabled={paymentNotified}
              className={`w-full py-2 px-3 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                paymentNotified
                  ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
              }`}
            >
              {paymentNotified ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pagamento Confirmado</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirmar Pagamento</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mb-5 border-b border-[#2d3e28] pb-3 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-red-500" />
          Agendar Estande / Treino
        </h2>
        <span className="text-[11px] font-semibold text-emerald-400 bg-[#0e140d] px-2.5 py-1 rounded-full border border-[#2e402a]">
          Raias Privadas
        </span>
      </div>

      {/* Form de Agendamento */}
      <form onSubmit={handleBookingSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            Escolha a Data
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              id="ag-data"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            Horário / Turno de Preferência
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <Clock className="w-4 h-4" />
            </div>
            <select
              id="ag-turno"
              value={selectedShift}
              onChange={(e) => {
                const val = e.target.value;
                if (isSlotOccupied(val)) {
                  alert(`⚠️ O horário "${val}" está INDISPONÍVEL e bloqueado nesta data!`);
                  return;
                }
                setSelectedShift(val);
              }}
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all cursor-pointer"
            >
              <option value="">
                {!selectedDate ? 'Selecione a data primeiro...' : 'Selecione o horário...'}
              </option>
              
              <optgroup label="Turnos Operacionais (Períodos)">
                {["Manhã (08:00 às 12:00)", "Tarde (13:00 às 18:00)", "Noite (18:00 às 21:00)"].map((shiftLabel) => {
                  const blocked = isSlotBlockedByAdmin(shiftLabel);
                  const occupied = isSlotOccupied(shiftLabel);
                  return (
                    <option
                      key={shiftLabel}
                      value={shiftLabel}
                      disabled={occupied}
                      className={occupied ? "text-red-500 font-bold bg-red-950/90" : ""}
                      style={occupied ? { color: '#ff3333', backgroundColor: '#330000', fontWeight: 'bold' } : undefined}
                    >
                      {shiftLabel} {blocked ? ' 🔒 BLOQUEADO PELO ADMINISTRADOR' : occupied ? ' ⛔ INDISPONÍVEL' : ''}
                    </option>
                  );
                })}
              </optgroup>

              <optgroup label="Manhã (07:00 às 12:00 - Intervalos de 10 min)">
                {morningSlots.map((time) => {
                  const value = `Manhã (${time})`;
                  const blocked = isSlotBlockedByAdmin(value, time);
                  const occupied = isSlotOccupied(value, time);
                  return (
                    <option
                      key={`m-${time}`}
                      value={value}
                      disabled={occupied}
                      className={occupied ? "text-red-500 font-bold bg-red-950/90" : ""}
                      style={occupied ? { color: '#ff3333', backgroundColor: '#330000', fontWeight: 'bold' } : undefined}
                    >
                      {time} (Manhã) {blocked ? ' 🔒 BLOQUEADO PELO ADMINISTRADOR' : occupied ? ' ⛔ INDISPONÍVEL' : ''}
                    </option>
                  );
                })}
              </optgroup>

              <optgroup label="Intervalo de Almoço (12:00 às 13:00 - Indisponível)" disabled />

              <optgroup label="Tarde / Noite (13:00 às 21:00 - Intervalos de 10 min)">
                {afternoonSlots.map((time) => {
                  const value = `Tarde/Noite (${time})`;
                  const blocked = isSlotBlockedByAdmin(value, time);
                  const occupied = isSlotOccupied(value, time);
                  return (
                    <option
                      key={`t-${time}`}
                      value={value}
                      disabled={occupied}
                      className={occupied ? "text-red-500 font-bold bg-red-950/90" : ""}
                      style={occupied ? { color: '#ff3333', backgroundColor: '#330000', fontWeight: 'bold' } : undefined}
                    >
                      {time} (Tarde/Noite) {blocked ? ' 🔒 BLOQUEADO PELO ADMINISTRADOR' : occupied ? ' ⛔ INDISPONÍVEL' : ''}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>
          {selectedDate && (
            <div className="mt-2 text-xs">
              {activeBookings.some((b) => b.date === selectedDate && !b.status?.toLowerCase().includes('cancel')) ? (
                <div className="bg-red-950/80 border border-red-700 text-red-200 p-2.5 rounded-lg flex items-center gap-2">
                  <span className="text-red-400 font-bold text-sm">🔒</span>
                  <span>
                    <strong>Trava de Conflito Ativa:</strong> Horários em <strong className="text-red-400">vermelho com INDISPONÍVEL</strong> já foram reservados para o dia {formatDateDisplay(selectedDate)} e estão bloqueados.
                  </span>
                </div>
              ) : (
                <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-2 rounded-lg flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✅</span>
                  <span>Todos os horários estão livres para a data {formatDateDisplay(selectedDate)}.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            Loja que Indicou
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/80">
              <Store className="w-4 h-4" />
            </div>
            <input
              id="ag-loja-indicou"
              type="text"
              value={inputLojaIndicou}
              onChange={(e) => setInputLojaIndicou(e.target.value)}
              placeholder=""
              className="w-full pl-9 pr-3 py-2.5 bg-[#0e140d] border border-[#2e402a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg shadow-lg hover:shadow-red-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Solicitar Agendamento</span>
        </button>
      </form>

      <hr className="my-6 border-[#2d3e28]" />

      {/* Seus Agendamentos */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white tracking-tight mb-3 flex items-center justify-between">
          <span>Seus Agendamentos</span>
          <span className="text-xs font-semibold bg-[#0e140d] text-orange-400 px-2.5 py-0.5 rounded-full border border-[#2e402a]">
            {activeBookings.length}
          </span>
        </h3>

        <div id="c-meus-agendamentos">
          {activeBookings.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-[#0e140d] p-4 rounded-lg text-center border border-dashed border-[#2e402a]">
              Nenhum agendamento realizado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((item) => {
                const isConfirmed = item.status === 'Confirmado' || item.status === 'Aprovado';
                const isCancelled = item.status === 'Cancelado';

                return (
                  <div
                    key={item.id}
                    className={`item-list p-4 rounded-lg border transition-all shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isConfirmed
                        ? 'bg-gradient-to-r from-[#0d1e11] to-[#0e140d] border-emerald-600/70 ring-1 ring-emerald-500/20 shadow-emerald-950/20'
                        : isCancelled
                        ? 'bg-gradient-to-r from-[#200e0e] to-[#0e140d] border-red-700/70 ring-1 ring-red-500/20 shadow-red-950/20'
                        : 'bg-[#0e140d] border-[#2a3c26] hover:border-[#3b5235]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-slate-100 font-semibold">
                          <strong>Data:</strong> {formatDateDisplay(item.date)} -{' '}
                          <strong>Horário:</strong> {item.shift}
                        </p>

                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-300 border border-emerald-600 px-2 py-0.5 rounded-full shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Confirmado pelo Administrador
                          </span>
                        )}

                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-red-950 text-red-300 border border-red-600 px-2 py-0.5 rounded-full shadow-xs">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            Cancelado pelo Administrador
                          </span>
                        )}
                      </div>

                      {item.lojaIndicou && (
                        <p className="text-xs text-slate-300">
                          <strong>Loja Indicou:</strong> {item.lojaIndicou}
                        </p>
                      )}

                      {item.adminNote && (
                        <div className="text-xs bg-[#152213] text-orange-300 p-2 rounded border border-[#2c4028] mt-1.5 flex items-start gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-orange-400">Observação do Administrador:</strong> {item.adminNote}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs pt-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                            isConfirmed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : isCancelled
                              ? 'bg-red-950 text-red-400 border border-red-700 line-through'
                              : 'bg-orange-950 text-orange-300 border border-orange-700'
                          }`}
                        >
                          Status: {item.status}
                        </span>

                        {item.updatedAt && (
                          <span className="text-[10px] text-slate-400">
                            Atualizado em {new Date(item.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.status !== 'Cancelado' && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(item.id)}
                        className="btn-danger py-2 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Cancelar Agendamento
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Histórico Completo de Agendamentos */}
      <div className="mb-6 border-t border-[#2d3e28] pt-6">
        <h3 className="text-lg font-bold text-white tracking-tight mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-400" />
            📜 Histórico Completo de Agendamentos (Salvo no Banco)
          </span>
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Histórico permanente salvo na coleção <code className="text-emerald-400 font-mono">historico_agendamentos</code> do Firestore.
        </p>

        <div id="c-historico-agendamentos">
          {(() => {
            const userHistory = bookingHistory.filter((item) => {
              if (!currentUser) return true;
              const nameMatch = currentUser.name && (item.userName?.toLowerCase() === currentUser.name.toLowerCase() || item.userName?.toLowerCase().includes(currentUser.name.toLowerCase()));
              const emailMatch = currentUser.email && item.userEmail?.toLowerCase() === currentUser.email.toLowerCase();
              return nameMatch || emailMatch;
            });

            const displayList = userHistory.length > 0 ? userHistory : bookingHistory;

            if (displayList.length === 0) {
              return (
                <p className="text-xs text-slate-400 italic bg-[#0e140d] p-4 rounded-lg text-center border border-dashed border-[#2e402a]">
                  Nenhum registro no histórico permanente ainda.
                </p>
              );
            }

            return (
              <div className="space-y-3">
                {displayList.map((item) => (
                  <div
                    key={`c-hist-${item.id}`}
                    className="bg-[#0e140d] p-4 rounded-lg border border-[#2a3c26] hover:border-[#3b5235] transition-all shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm text-slate-100 font-semibold mb-1">
                        <strong>Data:</strong> {formatDateDisplay(item.date)} -{' '}
                        <strong>Horário:</strong> {item.shift}
                      </p>
                      {item.lojaIndicou && (
                        <p className="text-xs text-slate-300 mb-1">
                          <strong>Loja Indicou:</strong> <span className="text-orange-300 font-bold">{item.lojaIndicou}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            item.status === 'Confirmado' || item.status === 'Aprovado'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : item.status === 'Cancelado' || item.status.includes('Excluído')
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-orange-950 text-orange-300 border border-orange-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono self-start sm:self-center">
                      ID: {item.id}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="btn-danger w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-colors mt-6 cursor-pointer"
        >
          Sair do Sistema
        </button>
      )}
    </div>
  );
};

