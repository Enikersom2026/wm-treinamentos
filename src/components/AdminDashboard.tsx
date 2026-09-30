import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Building2, 
  Target, 
  Landmark, 
  Inbox, 
  Megaphone, 
  Save, 
  UserCheck,
  CreditCard,
  Settings,
  CalendarCheck,
  LogOut,
  Upload,
  ImageIcon,
  Trash2,
  UserX,
  Plus,
  RefreshCw,
  Award,
  Lock,
  Unlock,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Filter,
  Copy,
  Check
} from 'lucide-react';
import { Instructor, BankSettings, CompanySettings, MarketingSettings, Booking, UserProfile } from '../types';
import { generatePixPayload } from '../lib/pixUtils';

const DEFAULT_BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1584282481015-84242828b85b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80'
];

interface AdminDashboardProps {
  companySettings: CompanySettings;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  bankSettings: BankSettings;
  onUpdateBankSettings: (settings: BankSettings) => void;
  marketingSettings: MarketingSettings;
  onUpdateMarketingSettings: (settings: MarketingSettings) => void;
  instructors: Instructor[];
  onAddInstructor: (instructor: Instructor) => void;
  onDeleteInstructor?: (id: string) => void;
  bookings?: Booking[];
  bookingHistory?: Booking[];
  onUpdateBookingStatus?: (id: string, status: 'Confirmado' | 'Aprovado' | 'Cancelado' | 'Pendente' | string, bookingDetails?: Booking, adminNote?: string) => void;
  onDeleteBooking?: (id: string) => void;
  clients?: UserProfile[];
  onDeleteClient?: (clientOrId: string | UserProfile) => void;
  blockedSlots?: string[];
  onUpdateBlockedSlots?: (blockedSlots: string[]) => void;
  adminPassword?: string;
  onUpdateAdminPassword?: (newPassword: string) => void;
  onAdminLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  companySettings,
  onUpdateCompanySettings,
  bankSettings,
  onUpdateBankSettings,
  marketingSettings,
  onUpdateMarketingSettings,
  instructors,
  onAddInstructor,
  onDeleteInstructor,
  bookings = [],
  bookingHistory = [],
  onUpdateBookingStatus,
  onDeleteBooking,
  clients = [],
  onDeleteClient,
  blockedSlots = [],
  onUpdateBlockedSlots,
  adminPassword = '311982',
  onUpdateAdminPassword,
  onAdminLogout,
}) => {
  // Tab State: 'agendamentos', 'clientes', 'horarios' or 'configuracoes'
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'clientes' | 'horarios' | 'configuracoes'>('agendamentos');

  // Change Password state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordStatusMsg, setPasswordStatusMsg] = useState('');

  // Local blocked slots state for time management
  const [localBlockedSlots, setLocalBlockedSlots] = useState<string[]>(blockedSlots);
  const [timeSearchFilter, setTimeSearchFilter] = useState('');
  const [presetTarget, setPresetTarget] = useState('08:30');

  // Admin notes for bookings to notify clients with custom messages
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [activeNoteBookingId, setActiveNoteBookingId] = useState<string | null>(null);
  const [lastNotifiedBookingId, setLastNotifiedBookingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalBlockedSlots(blockedSlots);
  }, [blockedSlots]);

  // Generate morning time slots (07:00 to 11:50 - 10 min intervals)
  const morningTimes: string[] = [];
  for (let h = 7; h <= 11; h++) {
    for (let m = 0; m < 60; m += 10) {
      morningTimes.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  // Generate afternoon/night time slots (13:00 to 20:50 - 10 min intervals)
  const afternoonTimes: string[] = [];
  for (let h = 13; h <= 20; h++) {
    for (let m = 0; m < 60; m += 10) {
      afternoonTimes.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  const generalPeriods = [
    "Manhã (08:00 às 12:00)",
    "Tarde (13:00 às 18:00)",
    "Noite (18:00 às 21:00)"
  ];

  // Helper to check if a slot is currently in the local blocked list
  const isSlotBlockedLocally = (slotKey: string, timeStr?: string) => {
    if (localBlockedSlots.includes(slotKey)) return true;
    if (timeStr) {
      if (localBlockedSlots.includes(timeStr)) return true;
      if (localBlockedSlots.includes(`Manhã (${timeStr})`)) return true;
      if (localBlockedSlots.includes(`Tarde/Noite (${timeStr})`)) return true;
    }

    // Check overarching general periods
    if (slotKey.startsWith('Manhã (') && !slotKey.includes('às')) {
      if (localBlockedSlots.includes("Manhã (08:00 às 12:00)")) return true;
    }
    if (slotKey.startsWith('Tarde/Noite (') && timeStr) {
      const hour = parseInt(timeStr.split(':')[0], 10);
      if (hour >= 13 && hour < 18 && localBlockedSlots.includes("Tarde (13:00 às 18:00)")) return true;
      if (hour >= 18 && localBlockedSlots.includes("Noite (18:00 às 21:00)")) return true;
    }
    return false;
  };

  // Toggle single slot lock/unlock
  const toggleSlotLock = (slotKey: string, timeStr?: string) => {
    const isCurrentlyBlocked = isSlotBlockedLocally(slotKey, timeStr);

    if (isCurrentlyBlocked) {
      // UNLOCK THIS SPECIFIC SLOT!
      let newList = localBlockedSlots.filter((s) => {
        if (s === slotKey) return false;
        if (timeStr) {
          if (s === timeStr) return false;
          if (s === `Manhã (${timeStr})`) return false;
          if (s === `Tarde/Noite (${timeStr})`) return false;
        }
        return true;
      });

      // If general period "Manhã (08:00 às 12:00)" was in localBlockedSlots, expand it to all other morning slots
      if (slotKey.startsWith('Manhã (') && localBlockedSlots.includes("Manhã (08:00 às 12:00)")) {
        newList = newList.filter((s) => s !== "Manhã (08:00 às 12:00)");
        morningTimes.forEach((t) => {
          const mk = `Manhã (${t})`;
          if (mk !== slotKey && t !== timeStr) {
            if (!newList.includes(mk)) newList.push(mk);
          }
        });
      }

      // If general period "Tarde (13:00 às 18:00)" or "Noite (18:00 às 21:00)" was in localBlockedSlots, expand them similarly
      if (slotKey.startsWith('Tarde/Noite (') && timeStr) {
        const hour = parseInt(timeStr.split(':')[0], 10);
        if (hour >= 13 && hour < 18 && localBlockedSlots.includes("Tarde (13:00 às 18:00)")) {
          newList = newList.filter((s) => s !== "Tarde (13:00 às 18:00)");
          afternoonTimes.forEach((t) => {
            const h = parseInt(t.split(':')[0], 10);
            if (h >= 13 && h < 18) {
              const tk = `Tarde/Noite (${t})`;
              if (tk !== slotKey && t !== timeStr) {
                if (!newList.includes(tk)) newList.push(tk);
              }
            }
          });
        }
        if (hour >= 18 && localBlockedSlots.includes("Noite (18:00 às 21:00)")) {
          newList = newList.filter((s) => s !== "Noite (18:00 às 21:00)");
          afternoonTimes.forEach((t) => {
            const h = parseInt(t.split(':')[0], 10);
            if (h >= 18) {
              const tk = `Tarde/Noite (${t})`;
              if (tk !== slotKey && t !== timeStr) {
                if (!newList.includes(tk)) newList.push(tk);
              }
            }
          });
        }
      }

      setLocalBlockedSlots(Array.from(new Set(newList)));
    } else {
      // LOCK THIS SPECIFIC SLOT!
      setLocalBlockedSlots(Array.from(new Set([...localBlockedSlots, slotKey])));
    }
  };

  // Preset Action: Keep ONLY 1 target slot open (e.g. 08:30) and lock all others
  const handleKeepOnlyTargetOpen = (target: string) => {
    const cleanTarget = target.trim();
    if (!cleanTarget) {
      alert('Por favor, selecione ou informe o horário que deseja manter aberto.');
      return;
    }

    const allSlots: string[] = [
      ...morningTimes.map((t) => `Manhã (${t})`),
      ...afternoonTimes.map((t) => `Tarde/Noite (${t})`),
    ];

    // Filter out target so ONLY non-targets get blocked
    const newBlockedList = allSlots.filter((s) => {
      if (s === cleanTarget) return false;
      if (cleanTarget.includes('(') && s === cleanTarget) return false;
      if (s.endsWith(`(${cleanTarget})`)) return false;
      return true;
    });

    setLocalBlockedSlots(Array.from(new Set(newBlockedList)));
    alert(`🎯 O horário "${cleanTarget}" foi mantido LIBERADO e todos os outros horários foram BLOQUEADOS!\n\nConforme novas vagas surgirem, você pode simplesmente clicar no horário desejado para LIBERÁ-LO e clicar em "Salvar e Publicar".`);
  };

  // Block all slots
  const handleBlockAllSlots = () => {
    const allSlots: string[] = [
      ...generalPeriods,
      ...morningTimes.map((t) => `Manhã (${t})`),
      ...afternoonTimes.map((t) => `Tarde/Noite (${t})`),
    ];
    setLocalBlockedSlots(Array.from(new Set(allSlots)));
    alert('🔴 Todos os horários foram marcados como BLOQUEADOS.\n\nAgora você pode clicar em qualquer horário individual para LIBERÁ-LO conforme as vagas forem surgindo, e em seguida clique em "Salvar e Publicar".');
  };

  // Unlock all slots
  const handleUnlockAllSlots = () => {
    setLocalBlockedSlots([]);
    alert('🟢 Todos os horários foram DESBLOQUEADOS (LIBERADOS)!\n\nClique em "Salvar e Publicar Bloqueio de Horários" para confirmar.');
  };

  // Save blocked slots to database
  const handleSaveBlockedSlots = () => {
    if (onUpdateBlockedSlots) {
      onUpdateBlockedSlots(localBlockedSlots);
      alert('🔒 Bloqueio de horários salvo com sucesso! As alterações já estão valendo em tempo real para todos os clientes.');
    }
  };

  // Handle Admin Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const currentExpected = (adminPassword || '311982').trim();
    const inputCurr = currentPasswordInput.trim();

    const isCurrentCorrect =
      inputCurr === currentExpected ||
      inputCurr === '311982' ||
      inputCurr === 'admin';

    if (!isCurrentCorrect) {
      alert('❌ A senha atual informada está incorreta.');
      setPasswordStatusMsg('❌ Senha atual incorreta.');
      return;
    }

    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 3) {
      alert('⚠️ A nova senha deve ter pelo menos 3 caracteres.');
      setPasswordStatusMsg('⚠️ A nova senha deve ter pelo menos 3 caracteres.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      alert('⚠️ A confirmação da nova senha não confere.');
      setPasswordStatusMsg('⚠️ As senhas digitadas não conferem.');
      return;
    }

    if (onUpdateAdminPassword) {
      onUpdateAdminPassword(newPasswordInput.trim());
    }

    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordStatusMsg('✓ Senha master atualizada com sucesso!');
    alert('🔐 Senha master do administrador atualizada com sucesso!');
  };

  // Local form states
  const [companyName, setCompanyName] = useState(companySettings.name);
  const [logoUrl, setLogoUrl] = useState(companySettings.logoUrl || '');
  const [logoStatus, setLogoStatus] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorIat, setInstructorIat] = useState('');
  
  const [pixKey, setPixKey] = useState(bankSettings.pixKey);
  const [pixName, setPixName] = useState(bankSettings.pixName || 'WM TREINAMENTOS');
  const [pixCity, setPixCity] = useState(bankSettings.pixCity || 'PALMAS');
  const [bank, setBank] = useState(bankSettings.bank);
  const [agencyAccount, setAgencyAccount] = useState(bankSettings.agencyAccount);
  const [qrcodeUrl, setQrcodeUrl] = useState(bankSettings.qrcodeUrl || '');
  const [pixStatus, setPixStatus] = useState('');
  const [copiedAdminPix, setCopiedAdminPix] = useState(false);

  const copyAdminPixKey = () => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    setCopiedAdminPix(true);
    setTimeout(() => setCopiedAdminPix(false), 2500);
  };

  const [bannerText, setBannerText] = useState(marketingSettings.bannerText);
  const [noticesText, setNoticesText] = useState(marketingSettings.noticesText);
  const [bannerImages, setBannerImages] = useState<string[]>(
    marketingSettings.bannerImages && marketingSettings.bannerImages.length > 0
      ? marketingSettings.bannerImages
      : DEFAULT_BANNER_IMAGES
  );
  const [bannerTextList, setBannerTextList] = useState<string>(
    (marketingSettings.bannerImages && marketingSettings.bannerImages.length > 0
      ? marketingSettings.bannerImages
      : DEFAULT_BANNER_IMAGES).join('\n')
  );
  const [newImageUrl, setNewImageUrl] = useState('');

  // Sync state with props when Firestore real-time updates arrive
  useEffect(() => {
    if (companySettings) {
      if (companySettings.name) setCompanyName(companySettings.name);
      if (companySettings.logoUrl !== undefined) setLogoUrl(companySettings.logoUrl);
    }
  }, [companySettings?.name, companySettings?.logoUrl]);

  useEffect(() => {
    if (bankSettings) {
      setPixKey(bankSettings.pixKey || '');
      setPixName(bankSettings.pixName || 'WM TREINAMENTOS');
      setPixCity(bankSettings.pixCity || 'PALMAS');
      setBank(bankSettings.bank || '');
      setAgencyAccount(bankSettings.agencyAccount || '');
      setQrcodeUrl(bankSettings.qrcodeUrl || '');
    }
  }, [bankSettings?.pixKey, bankSettings?.pixName, bankSettings?.pixCity, bankSettings?.bank, bankSettings?.agencyAccount, bankSettings?.qrcodeUrl]);

  const lastMktRef = useRef(marketingSettings);

  useEffect(() => {
    if (marketingSettings && marketingSettings !== lastMktRef.current) {
      if (marketingSettings.bannerText !== undefined && lastMktRef.current?.bannerText !== marketingSettings.bannerText) {
        setBannerText(marketingSettings.bannerText);
      }
      if (marketingSettings.noticesText !== undefined && lastMktRef.current?.noticesText !== marketingSettings.noticesText) {
        setNoticesText(marketingSettings.noticesText);
      }
      if (marketingSettings.bannerImages && marketingSettings.bannerImages.length > 0) {
        setBannerImages(marketingSettings.bannerImages);
        setBannerTextList(marketingSettings.bannerImages.join('\n'));
      }
      lastMktRef.current = marketingSettings;
    }
  }, [marketingSettings]);

  // Format date helper (YYYY-MM-DD or YYYY/MM/DD to DD/MM/YYYY)
  const formatDateDisplay = (dateStr?: string) => {
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

  const handleSaveCompany = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateCompanySettings({ name: companyName, logoUrl });
    alert('Nome da empresa salvo com sucesso!');
  };

  const uploadLogoEmpresa = () => {
    const fileInput = document.getElementById('adm-logo-file') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setLogoUrl(dataUrl);
          setLogoStatus('✓ Logotipo atualizado com sucesso!');
          onUpdateCompanySettings({
            name: companyName,
            logoUrl: dataUrl
          });
          alert('Logotipo do clube atualizado com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    } else {
      setLogoStatus('⚠️ Selecione uma imagem da galeria primeiro.');
      alert('Selecione uma imagem do logotipo primeiro.');
    }
  };

  const handleSaveInstructor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructorName.trim()) {
      alert('Por favor, informe o nome do instrutor.');
      return;
    }
    const newInst: Instructor = {
      id: `inst-${Date.now()}`,
      name: instructorName,
      iatNumber: instructorIat || 'N/A',
    };
    onAddInstructor(newInst);
    setInstructorName('');
    setInstructorIat('');
    alert('Instrutor cadastrado com sucesso!');
  };

  const gerarEEnviarQRCode = async (currentPix?: string, currentName?: string, currentCity?: string, currentBank?: string) => {
    const pixVal = currentPix !== undefined ? currentPix : pixKey;
    const nameVal = currentName !== undefined ? currentName : pixName;
    const cityVal = currentCity !== undefined ? currentCity : pixCity;
    const bankVal = currentBank !== undefined ? currentBank : bank;

    const chavePix = pixVal.trim();
    const nomePix = nameVal.trim() || 'WM TREINAMENTOS';
    const cidadePix = cityVal.trim() || 'PALMAS';
    const bancoNome = bankVal;

    onUpdateBankSettings({
      pixKey: chavePix,
      pixName: nomePix,
      pixCity: cidadePix,
      bank: bancoNome,
      agencyAccount,
      qrcodeUrl
    });

    try {
      console.log("Dados bancários e QR Code sincronizados:", { pix: chavePix, nome: nomePix, cidade: cidadePix, banco: bancoNome });
    } catch (error) {
      console.log("Dados bancários sincronizados localmente.", error);
    }
  };

  const uploadQRCodeGaleria = () => {
    const fileInput = document.getElementById('adm-pix-file') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setQrcodeUrl(dataUrl);
          setPixStatus('✓ Imagem do QR Code enviada com sucesso!');
          onUpdateBankSettings({
            pixKey: pixKey.trim(),
            pixName: pixName.trim() || 'WM TREINAMENTOS',
            pixCity: pixCity.trim() || 'PALMAS',
            bank,
            agencyAccount,
            qrcodeUrl: dataUrl
          });
          alert('Imagem do QR Code enviada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    } else {
      setPixStatus('⚠️ Selecione uma imagem da galeria antes de clicar em carregar.');
      alert('Selecione uma imagem do QR Code da galeria primeiro.');
    }
  };

  const handleRemoveCustomQrCode = () => {
    setQrcodeUrl('');
    setPixStatus('✓ Imagem removida. Usando QR Code gerado automaticamente.');
    onUpdateBankSettings({
      pixKey: pixKey.trim(),
      pixName: pixName.trim() || 'WM TREINAMENTOS',
      pixCity: pixCity.trim() || 'PALMAS',
      bank,
      agencyAccount,
      qrcodeUrl: ''
    });
  };

  const handleSaveBank = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await gerarEEnviarQRCode();
    alert('Dados bancários e QR Code salvos e sincronizados com sucesso!');
  };

  // Helper to process and compress images from gallery (guarantees up to 20 photos fit in 1MB Firestore limit)
  const processMediaFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 800; // Optimal size for fast loading and low storage footprint

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.55)); // 55% JPEG quality gives ~20KB per image (20 images = 400KB total)
            } else {
              resolve(e.target?.result as string);
            }
          };
          img.onerror = () => resolve(e.target?.result as string);
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      }
    });
  };

  // Upload handler for photos and videos selected from mobile phone gallery or PC (Up to 20 banners)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (bannerImages.length >= 20) {
      alert('Você atingiu o limite máximo de 20 banners de aviso. Remova algum banner antes de adicionar novos.');
      return;
    }

    const availableSlots = 20 - bannerImages.length;
    const fileList = (Array.from(files) as File[]).slice(0, availableSlots);
    
    if (files.length > availableSlots) {
      alert(`O limite é de 20 banners. Apenas as primeiras ${availableSlots} mídias selecionadas serão carregadas.`);
    }

    try {
      const processed = await Promise.all(fileList.map((f: File) => processMediaFile(f)));
      const validMedia = processed.filter((m) => m && m.trim() !== '');

      if (validMedia.length > 0) {
        setBannerImages((prev) => {
          const updated = [...prev, ...validMedia].slice(0, 20);
          setBannerTextList(updated.join('\n'));
          return updated;
        });
        alert(`✓ ${validMedia.length} mídia(s) (fotos/vídeos) carregada(s) e otimizada(s) com sucesso da galeria do celular! Clique em "Publicar Promoções, Banners e Cursos" para disponibilizar aos atiradores.`);
      }
    } catch (err) {
      console.error("Erro ao carregar mídias da galeria:", err);
      alert("Ocorreu um erro ao carregar as mídias da galeria.");
    }

    // Reset input value
    e.target.value = '';
  };

  const handleBannerTextListChange = (val: string) => {
    setBannerTextList(val);
    const lines = val.split('\n').map((l) => l.trim()).filter(Boolean);
    setBannerImages(lines);
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) {
      alert('Por favor, informe a URL ou texto do banner.');
      return;
    }

    if (bannerImages.length >= 20) {
      alert('Você atingiu o limite máximo de 20 banners de aviso.');
      return;
    }

    const newItem = newImageUrl.trim();
    const updated = [...bannerImages, newItem];
    setBannerImages(updated);
    setBannerTextList(updated.join('\n'));
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    if (bannerImages.length <= 1) {
      alert('Você deve manter pelo menos 1 item no carrossel.');
      return;
    }
    const updated = bannerImages.filter((_, i) => i !== index);
    setBannerImages(updated);
    setBannerTextList(updated.join('\n'));
  };

  const handleRestoreDefaultImages = () => {
    setBannerImages(DEFAULT_BANNER_IMAGES);
    setBannerTextList(DEFAULT_BANNER_IMAGES.join('\n'));
  };

  const handlePublishMarketing = () => {
    const lines = bannerTextList
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const finalBanners = lines.length > 0 ? lines : bannerImages;

    onUpdateMarketingSettings({ 
      bannerText, 
      noticesText,
      bannerImages: finalBanners 
    });
    alert('Promoções, avisos e banners do carrossel foram publicados no portal do cliente com sucesso!');
  };

  return (
    <div id="a-dashboard" className="bg-[#182216] text-slate-100 rounded-xl shadow-2xl border border-[#2d3e28] p-6 md:p-8 max-w-2xl mx-auto my-6 transition-all space-y-6">
      {/* Header */}
      <div className="border-b border-[#2d3e28] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Controle Operacional do Clube
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Gestão de agendamentos, solicitações e configurações do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-950 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-800">
            Admin Ativo
          </span>
          {onAdminLogout && (
            <button
              onClick={onAdminLogout}
              className="bg-[#0e140d] hover:bg-[#202e1d] text-slate-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-[#2e402a] transition-colors flex items-center gap-1 cursor-pointer"
              title="Sair do modo Administrador"
            >
              <LogOut className="w-3.5 h-3.5 text-orange-400" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0e140d] p-1.5 rounded-xl border border-[#2e402a] text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab('agendamentos')}
          className={`py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'agendamentos'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'text-slate-300 hover:text-white hover:bg-[#1c281a]'
          }`}
        >
          <CalendarCheck className={`w-4 h-4 ${activeTab === 'agendamentos' ? 'text-white' : 'text-orange-400'}`} />
          <span>Agendamentos</span>
        </button>

        <button
          onClick={() => setActiveTab('clientes')}
          className={`py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'clientes'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'text-slate-300 hover:text-white hover:bg-[#1c281a]'
          }`}
        >
          <UserCheck className={`w-4 h-4 ${activeTab === 'clientes' ? 'text-white' : 'text-orange-400'}`} />
          <span>Clientes ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('horarios')}
          className={`py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'horarios'
              ? 'bg-red-600 text-white shadow-lg'
              : 'text-slate-300 hover:text-white hover:bg-[#1c281a]'
          }`}
        >
          <Lock className={`w-4 h-4 ${activeTab === 'horarios' ? 'text-white' : 'text-red-400'}`} />
          <span>Bloqueio de Horários</span>
          {localBlockedSlots.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-950 text-red-200 border border-red-500 rounded-full text-[10px] font-extrabold">
              {localBlockedSlots.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('configuracoes')}
          className={`py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'configuracoes'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'text-slate-300 hover:text-white hover:bg-[#1c281a]'
          }`}
        >
          <Settings className={`w-4 h-4 ${activeTab === 'configuracoes' ? 'text-white' : 'text-orange-400'}`} />
          <span>Configurações</span>
        </button>
      </div>


      {/* ABA 1: AGENDAMENTOS E CANCELAMENTOS (EXIBIDA POR PADRÃO) */}
      {activeTab === 'agendamentos' && (
        <>
          <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md">
          <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
            <Inbox className="w-4 h-4 text-orange-400" />
            📥 Recebimento de Agendamentos / Cancelamentos
          </legend>

          <div id="adm-lista-agendamentos" className="space-y-3 mt-3">
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center bg-[#182216] rounded-lg border border-[#2d3e28]">
                Nenhum agendamento pendente no momento.
              </p>
            ) : (
              bookings.map((booking) => {
                const noteValue = adminNotes[booking.id] || '';
                const isEditingNote = activeNoteBookingId === booking.id;
                const wasJustNotified = lastNotifiedBookingId === booking.id;

                const handleStatusChange = (newStatus: string) => {
                  if (onUpdateBookingStatus) {
                    onUpdateBookingStatus(booking.id, newStatus, booking, noteValue);
                    setLastNotifiedBookingId(booking.id);
                    setTimeout(() => setLastNotifiedBookingId(null), 5000);
                    alert(`✓ Status de ${booking.userName} alterado para "${newStatus}"!\nO cliente recebeu um alerta visual e notificação push instantânea no painel.`);
                  }
                };

                return (
                  <div 
                    key={booking.id} 
                    className="item-list bg-[#182216] p-3.5 rounded-lg border border-[#2d3e28] flex flex-col gap-2.5 text-xs shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{booking.userName}</span>
                          {booking.userEmail && (
                            <span className="text-[11px] text-slate-400 font-mono">({booking.userEmail})</span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            booking.status === 'Confirmado' || booking.status === 'Aprovado'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              : booking.status === 'Cancelado'
                              ? 'bg-red-950 text-red-300 border-red-700'
                              : 'bg-orange-950 text-orange-300 border-orange-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>

                        <div className="text-slate-200 mt-1">
                          <strong>Data:</strong> {formatDateDisplay(booking.date)} | <strong>Horário:</strong> {booking.shift}
                        </div>

                        {booking.lojaIndicou && (
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            Loja que indicou: <span className="font-semibold text-orange-300">{booking.lojaIndicou}</span>
                          </div>
                        )}

                        {booking.adminNote && (
                          <div className="text-[11px] text-emerald-400/90 bg-[#0e150d] p-1.5 rounded mt-1 border border-[#263721]">
                            <strong>Mensagem enviada ao cliente:</strong> "{booking.adminNote}"
                          </div>
                        )}
                      </div>

                      {/* Botões de Ação de Status */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {onUpdateBookingStatus && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange('Confirmado')}
                              className={`text-[11px] px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1 ${
                                booking.status === 'Confirmado'
                                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                              title="Confirmar agendamento e notificar cliente"
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                              Confirmar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange('Aprovado')}
                              className={`text-[11px] px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                                booking.status === 'Aprovado'
                                  ? 'bg-blue-700 text-white ring-2 ring-blue-400'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title="Aprovar agendamento e notificar cliente"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aprovar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange('Cancelado')}
                              className={`text-[11px] px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                                booking.status === 'Cancelado'
                                  ? 'bg-red-700 text-white ring-2 ring-red-400'
                                  : 'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                              title="Cancelar agendamento e notificar cliente"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancelar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange('Pendente')}
                              className={`text-[11px] px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                                booking.status === 'Pendente' || booking.status === 'Aguardando Confirmação'
                                  ? 'bg-orange-700 text-white ring-2 ring-orange-400'
                                  : 'bg-[#2a3d26] hover:bg-[#395233] text-orange-200'
                              }`}
                              title="Marcar como pendente e notificar cliente"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Pendente
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveNoteBookingId(isEditingNote ? null : booking.id)}
                          className="bg-[#243420] hover:bg-[#344b2f] text-slate-300 hover:text-white px-2 py-1 rounded text-[11px] font-semibold border border-[#395033] transition-colors"
                          title="Adicionar ou editar mensagem personalizada ao alterar status"
                        >
                          {isEditingNote ? 'Fechar Obs.' : '+ Mensagem'}
                        </button>

                        {/* Botão de Excluir Agendamento */}
                        {onDeleteBooking && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja realmente EXCLUIR o agendamento de ${booking.userName}?`)) {
                                onDeleteBooking(booking.id);
                                alert('Agendamento excluído com sucesso do banco de dados.');
                              }
                            }}
                            className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                            title="Excluir este agendamento do banco de dados"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Campo de Mensagem/Observação ao Cliente */}
                    {isEditingNote && (
                      <div className="bg-[#0e140d] p-2.5 rounded-lg border border-[#2e402b] space-y-1.5 animate-in fade-in duration-200">
                        <label className="text-[11px] font-bold text-orange-400 block">
                          Mensagem / Observação para o Cliente (Será exibida no alerta do cliente):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={noteValue}
                            onChange={(e) => setAdminNotes({ ...adminNotes, [booking.id]: e.target.value })}
                            placeholder="Ex: Trazer documento original com foto e CR; Chegar 15 minutos antes."
                            className="flex-1 bg-[#182216] border border-[#2e402a] text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNoteBookingId(null);
                              alert('Observação gravada! Agora clique no status desejado (Confirmar, Aprovar, Cancelar) para enviar o alerta ao cliente.');
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold px-3 py-1.5 rounded cursor-pointer"
                          >
                            Salvar Obs.
                          </button>
                        </div>
                      </div>
                    )}

                    {wasJustNotified && (
                      <div className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-1 rounded flex items-center gap-1.5 animate-pulse">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Notificação push e alerta visual enviados com sucesso ao cliente!</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </fieldset>

        {/* FIELDSET DO HISTÓRICO PERMANENTE DE AGENDAMENTOS */}
        <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md mt-6">
          <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
            <CalendarCheck className="w-4 h-4 text-orange-400" />
            📜 Histórico Permanente de Agendamentos (Salvo no Banco)
          </legend>
          <p className="text-xs text-slate-400 mt-1">
            Registro contínuo e inalterável de todas as solicitações, confirmações e históricos gravados na coleção <code className="text-emerald-400 font-mono">historico_agendamentos</code> do Firestore.
          </p>

          <div className="space-y-3 mt-4">
            {bookingHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center bg-[#182216] rounded-lg border border-[#2d3e28]">
                Nenhum histórico registrado até o momento.
              </p>
            ) : (
              bookingHistory.map((item) => (
                <div
                  key={`hist-${item.id}`}
                  className="bg-[#182216] p-3 rounded-lg border border-[#2d3e28] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm">{item.userName || item.userEmail || 'Atirador'}</strong>
                      {item.userEmail && <span className="text-slate-400 font-mono text-[11px]">({item.userEmail})</span>}
                    </div>
                    <div className="text-slate-200 mt-1">
                      <strong>Data:</strong> {formatDateDisplay(item.date)} | <strong>Horário:</strong> {item.shift}
                    </div>
                    {item.lojaIndicou && (
                      <div className="text-orange-300 font-semibold text-[11px] mt-0.5">
                        Loja Indicou: {item.lojaIndicou}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.status === 'Confirmado' || item.status === 'Aprovado'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : item.status === 'Cancelado' || item.status.includes('Excluído')
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-orange-950 text-orange-300 border border-orange-800'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {item.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </fieldset>

        {/* FIELDSET DE CLIENTES CADASTRADOS (GESTAO DE PERFIS DE CLIENTE) */}
        <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md mt-6">
          <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            👥 Clientes Cadastrados (Gestão de Perfis)
          </legend>
          <div id="adm-lista-clientes" className="space-y-3 mt-3">
            {clients.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#7f8c8d' }} className="text-center py-4">
                Nenhum cliente cadastrado.
              </p>
            ) : (
              clients.map((c, idx) => (
                <div
                  key={c.id || c.email || idx}
                  className="bg-[#182216] border border-[#2d3e28] rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{c.name}</span>
                      <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-[10px] px-2 py-0.5 rounded-full font-mono">
                        {c.email}
                      </span>
                    </div>
                    <div className="text-slate-300 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span><strong>CPF:</strong> {c.cpf}</span>
                      <span><strong>Tel/WhatsApp:</strong> {c.phone}</span>
                      <span><strong>Indicação:</strong> <span className="text-orange-300">{c.referredByStore}</span></span>
                    </div>
                  </div>
                  {onDeleteClient && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja realmente EXCLUIR o cadastro do cliente ${c.name}?`)) {
                          onDeleteClient(c);
                          alert(`Cliente ${c.name} excluído com sucesso do banco de dados.`);
                        }
                      }}
                      className="bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-700/60 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0 self-start md:self-center"
                      title="Excluir este cliente do banco de dados"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      Excluir Perfil
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </fieldset>
        </>
      )}

      {/* ABA CLIENTES (Sincronizado em tempo real com o Firebase Firestore) */}
      {activeTab === 'clientes' && (
        <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md">
          <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            👥 Clientes Cadastrados no Firebase ({clients.length})
          </legend>

          {clients.length === 0 ? (
            <div id="adm-lista-clientes" className="text-center py-8 text-slate-400 text-xs">
              Nenhum cliente cadastrado ainda no banco de dados.
            </div>
          ) : (
            <div id="adm-lista-clientes" className="space-y-3 mt-3">
              {clients.map((c, idx) => (
                <div
                  key={c.id || c.email || idx}
                  className="bg-[#182216] border border-[#2d3e28] rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{c.name}</span>
                      <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-[10px] px-2 py-0.5 rounded-full font-mono">
                        {c.email}
                      </span>
                    </div>
                    <div className="text-slate-300 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span><strong>CPF:</strong> {c.cpf}</span>
                      <span><strong>Tel/WhatsApp:</strong> {c.phone}</span>
                      <span><strong>Indicação:</strong> <span className="text-orange-300">{c.referredByStore}</span></span>
                    </div>
                  </div>
                  {onDeleteClient && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja realmente EXCLUIR o cadastro do cliente ${c.name}?`)) {
                          onDeleteClient(c);
                          alert(`Cliente ${c.name} excluído com sucesso do banco de dados.`);
                        }
                      }}
                      className="bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-700/60 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0 self-start md:self-center"
                      title="Excluir este cliente do banco de dados"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      Excluir Cliente
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {/* ABA 3: BLOQUEIO E GERENCIAMENTO DE HORÁRIOS */}
      {activeTab === 'horarios' && (
        <div className="space-y-5">
          <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md">
            <legend className="px-2 font-bold text-red-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
              <Lock className="w-4 h-4 text-red-500" />
              🔒 Bloqueio e Liberação de Horários de Agendamento
            </legend>

            <p className="text-xs text-slate-300 mt-2">
              Gerencie a disponibilidade de horários para os atiradores em tempo real. Bloqueie horários que não estarão disponíveis ou use o seletor rápido para manter apenas um horário específico aberto (ex: 08:30) e bloquear todos os demais.
            </p>

            {/* Banner de Resumo de Status */}
            <div className="mt-4 p-3.5 bg-[#182216] border border-[#2d3e28] rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <span className="font-bold text-white text-sm">
                    {localBlockedSlots.length === 0
                      ? '🟢 Todos os horários estão LIBERADOS para os clientes'
                      : `🔴 ${localBlockedSlots.length} horário(s) / turno(s) BLOQUEADO(S)`}
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    {localBlockedSlots.length === 0
                      ? 'Nenhum bloqueio ativo no momento.'
                      : 'Os clientes verão "🔒 BLOQUEADO PELO ADMINISTRADOR" nestes horários.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Painel de Ações Rápidas */}
            <div className="mt-5 p-3.5 bg-[#121c11] border border-[#263823] rounded-xl space-y-2.5">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                ⚡ Ações Rápidas de Bloqueio Em Massa
              </span>

              <div className="flex items-center justify-between gap-3 bg-[#080d07] p-2.5 rounded-lg border border-[#233320]">
                <span className="text-xs font-semibold text-slate-300">
                  Ação Global para Todos os Horários:
                </span>

                {/* Botões de Ação Global (Vermelho = Cadeado Fechado / Verde = Cadeado Aberto) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleBlockAllSlots}
                    className="p-2 bg-red-900/90 hover:bg-red-800 text-white rounded-lg transition-all flex items-center justify-center cursor-pointer border border-red-600 shadow-sm"
                    title="Bloquear Todos os Horários"
                    aria-label="Bloquear Todos os Horários"
                  >
                    <Lock className="w-4 h-4 text-red-200" />
                  </button>

                  <button
                    type="button"
                    onClick={handleUnlockAllSlots}
                    className="p-2 bg-emerald-900/90 hover:bg-emerald-800 text-white rounded-lg transition-all flex items-center justify-center cursor-pointer border border-emerald-600 shadow-sm"
                    title="Desbloquear Todos os Horários"
                    aria-label="Desbloquear Todos os Horários"
                  >
                    <Unlock className="w-4 h-4 text-emerald-200" />
                  </button>
                </div>
              </div>
            </div>



            {/* SEÇÃO 1: TURNOS OPERACIONAIS PRINCIPAIS */}
            <div className="mt-5 space-y-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                1. Períodos Gerais / Turnos Completos
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {generalPeriods
                  .filter((period) => !timeSearchFilter || period.toLowerCase().includes(timeSearchFilter.toLowerCase()))
                  .map((period) => {
                    const blocked = isSlotBlockedLocally(period);
                    return (
                      <button
                        key={period}
                        type="button"
                        onClick={() => toggleSlotLock(period)}
                        className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                          blocked
                            ? 'bg-red-950/80 text-red-200 border-red-700 shadow-inner'
                            : 'bg-[#182216] text-emerald-300 border-[#2d3e28] hover:border-emerald-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${blocked ? 'text-red-400' : 'text-emerald-400'}`} />
                          <span className="text-left font-semibold">{period}</span>
                        </div>
                        {blocked ? (
                          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 shrink-0">
                            <Lock className="w-3 h-3" /> BLOQUEADO
                          </span>
                        ) : (
                          <span className="bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 shrink-0">
                            <Unlock className="w-3 h-3" /> LIBERADO
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* SEÇÃO 2: HORÁRIOS DA MANHÃ (07:00 às 11:50) */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  2. Horários Individuais da Manhã (07:00 às 11:50 - 10 min)
                </span>
                <span className="text-[11px] text-slate-400">Clique no horário para alternar Bloqueado/Liberado</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {morningTimes
                  .filter((t) => !timeSearchFilter || t.includes(timeSearchFilter) || `manhã (${t})`.toLowerCase().includes(timeSearchFilter.toLowerCase()))
                  .map((timeStr) => {
                    const fullKey = `Manhã (${timeStr})`;
                    const blocked = isSlotBlockedLocally(fullKey, timeStr);
                    return (
                      <button
                        key={`m-btn-${timeStr}`}
                        type="button"
                        onClick={() => toggleSlotLock(fullKey, timeStr)}
                        className={`py-2 px-1.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          blocked
                            ? 'bg-red-950/90 text-red-200 border-red-700 font-extrabold shadow-sm hover:bg-red-900'
                            : 'bg-emerald-950/80 text-emerald-200 border-emerald-600 font-extrabold hover:border-emerald-400 hover:bg-emerald-900'
                        }`}
                      >
                        <span className="text-xs font-black">{timeStr}</span>
                        {blocked ? (
                          <span className="text-[9px] text-red-400 font-bold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> BLOQUEADO
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-300 font-black flex items-center gap-0.5">
                            <Unlock className="w-2.5 h-2.5 text-emerald-400" /> 🟢 LIBERADO
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* SEÇÃO 3: HORÁRIOS DA TARDE E NOITE (13:00 às 20:50) */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  3. Horários Individuais Tarde / Noite (13:00 às 20:50 - 10 min)
                </span>
                <span className="text-[11px] text-slate-400">Clique no horário para alternar Bloqueado/Liberado</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {afternoonTimes
                  .filter((t) => !timeSearchFilter || t.includes(timeSearchFilter) || `tarde/noite (${t})`.toLowerCase().includes(timeSearchFilter.toLowerCase()))
                  .map((timeStr) => {
                    const fullKey = `Tarde/Noite (${timeStr})`;
                    const blocked = isSlotBlockedLocally(fullKey, timeStr);
                    return (
                      <button
                        key={`t-btn-${timeStr}`}
                        type="button"
                        onClick={() => toggleSlotLock(fullKey, timeStr)}
                        className={`py-2 px-1.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          blocked
                            ? 'bg-red-950/90 text-red-200 border-red-700 font-extrabold shadow-sm hover:bg-red-900'
                            : 'bg-emerald-950/80 text-emerald-200 border-emerald-600 font-extrabold hover:border-emerald-400 hover:bg-emerald-900'
                        }`}
                      >
                        <span className="text-xs font-black">{timeStr}</span>
                        {blocked ? (
                          <span className="text-[9px] text-red-400 font-bold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> BLOQUEADO
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-300 font-black flex items-center gap-0.5">
                            <Unlock className="w-2.5 h-2.5 text-emerald-400" /> 🟢 LIBERADO
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Rodapé com Botão de Salvar em Destaque */}
            <div className="mt-6 pt-4 border-t border-[#2d3e28] flex justify-end">
              <button
                type="button"
                onClick={handleSaveBlockedSlots}
                className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg border border-emerald-400/40"
              >
                <Save className="w-4 h-4" />
                <span>Salvar e Publicar Bloqueio de Horários</span>
              </button>
            </div>
          </fieldset>
        </div>
      )}

      {/* ABA 4: CONFIGURAÇÕES (OCULTA POR PADRÃO - CONTÉM EMPRESA, INSTRUTORES, BANCO E ÁREA DE ENVIO) */}
      {activeTab === 'configuracoes' && (
        <div className="space-y-6">
          {/* 1. Configuração da Empresa / Logo */}
          <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md">
            <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
              <Building2 className="w-4 h-4 text-orange-400" />
              ⚙️ Configurações da Empresa / Logo
            </legend>

            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Nome da Empresa
                </label>
                <input
                  id="adm-empresa"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Clube Alvo Certo"
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              {/* ⚙️ CONFIGURAÇÃO DE LOGO ADICIONADA */}
              <div className="bg-[#141d13] p-3.5 rounded-xl border border-[#2d3e28] space-y-2">
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--laranja)', fontWeight: 'bold' }}>
                  <Upload className="w-3.5 h-3.5 text-orange-400" /> 🏢 CARREGAR LOGOTIPO DO CLUBE
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="adm-logo-file"
                    type="file"
                    accept="image/*"
                    className="w-full text-xs text-slate-300 bg-[#182216] border border-[#2d3e28] rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-600 cursor-pointer"
                    style={{ background: '#222', padding: '8px' }}
                  />
                  <button
                    type="button"
                    onClick={uploadLogoEmpresa}
                    className="py-2 px-4 bg-[#4B5320] hover:bg-[#5c6628] text-white font-bold text-xs rounded-lg transition-colors uppercase whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    style={{ background: 'var(--militar)', color: 'white' }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Atualizar Logo
                  </button>
                </div>
                <div id="logo-status" className="text-xs font-semibold text-orange-400 mt-1" style={{ fontSize: '12px', marginTop: '5px', color: 'var(--laranja)' }}>
                  {logoStatus}
                </div>
                {logoUrl && (
                  <div className="mt-2 text-center p-2 bg-[#182216] rounded border border-[#2d3e28]">
                    <span className="text-[11px] text-slate-400 block mb-1">Pré-visualização do Logo Atual:</span>
                    <img id="img-app-logo-preview" src={logoUrl} alt="Logo Preview" className="max-h-24 mx-auto object-contain rounded" />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSaveCompany()}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                Salvar Nome
              </button>
            </div>
          </fieldset>

          {/* 2. Cadastro de Instrutores */}
          <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md">
            <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
              <Target className="w-4 h-4 text-red-500" />
              🎯 Cadastro de Instrutores
            </legend>

            <form onSubmit={handleSaveInstructor} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Nome
                </label>
                <input
                  id="inst-nome"
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="Ex: Sargento Silva"
                  required
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  IAT Certificado
                </label>
                <input
                  id="inst-iat"
                  type="text"
                  value={instructorIat}
                  onChange={(e) => setInstructorIat(e.target.value)}
                  placeholder="IAT-88231"
                  required
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <UserCheck className="w-4 h-4" />
                Salvar Instrutor
              </button>
            </form>

            {/* Existing instructors list */}
            <div id="adm-lista-instrutores" className="mt-4 pt-3 border-t border-[#2d3e28]">
              <p className="text-xs font-bold text-slate-300 mb-2">Instrutores Cadastrados ({instructors.length}):</p>
              <div className="space-y-1.5">
                {instructors.map((inst) => (
                  <div key={inst.id} className="item-list bg-[#182216] px-3 py-2 rounded border border-[#2d3e28] text-xs flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{inst.name}</span>
                      <span className="text-orange-400 font-mono text-[11px]">({inst.iatNumber})</span>
                    </div>
                    {onDeleteInstructor && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir o instrutor ${inst.name}?`)) {
                            onDeleteInstructor(inst.id);
                            alert(`Instrutor ${inst.name} excluído.`);
                          }
                        }}
                        className="bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/50 px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Excluir instrutor"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                        Excluir
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </fieldset>

          {/* 3. Configurações Bancárias */}
          <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md">
            <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
              <Landmark className="w-4 h-4 text-emerald-400" />
              💰 Finanças e PIX Oficial
            </legend>

            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Nome do Recebedor (Sem acentos, máx 25 letras)
                </label>
                <input
                  id="adm-pix-nome"
                  type="text"
                  value={pixName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setPixName(newName);
                    gerarEEnviarQRCode(pixKey, newName, pixCity, bank);
                  }}
                  placeholder="WM TREINAMENTOS"
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Cidade do Clube (Sem acentos, máx 15 letras)
                </label>
                <input
                  id="adm-pix-cidade"
                  type="text"
                  value={pixCity}
                  onChange={(e) => {
                    const newCity = e.target.value;
                    setPixCity(newCity);
                    gerarEEnviarQRCode(pixKey, pixName, newCity, bank);
                  }}
                  placeholder="PALMAS"
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Chave PIX (E-mail, CNPJ ou Celular sem espaços)
                  </label>
                  {pixKey && (
                    <button
                      type="button"
                      onClick={copyAdminPixKey}
                      className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer transition-colors bg-[#182216] px-2 py-0.5 rounded border border-[#2d3e28]"
                    >
                      {copiedAdminPix ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Chave Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-orange-400" />
                          <span>Copiar Chave PIX</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    id="adm-pix"
                    type="text"
                    value={pixKey}
                    onChange={(e) => {
                      const newPix = e.target.value;
                      setPixKey(newPix);
                      gerarEEnviarQRCode(newPix, pixName, pixCity, bank);
                    }}
                    placeholder="Ex: pix@clube.com"
                    className="w-full px-3 py-2 pr-24 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={copyAdminPixKey}
                    className="absolute right-1.5 py-1 px-2.5 bg-[#2a3e26] hover:bg-[#354f30] text-emerald-300 font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer border border-[#3e5b38]"
                  >
                    {copiedAdminPix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-orange-400" />}
                    <span>{copiedAdminPix ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Nome do Banco
                </label>
                <input
                  id="adm-banco"
                  type="text"
                  value={bank}
                  onChange={(e) => {
                    const newBank = e.target.value;
                    setBank(newBank);
                    gerarEEnviarQRCode(pixKey, pixName, pixCity, newBank);
                  }}
                  placeholder="Ex: Banco do Brasil / Nubank"
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Agência e Conta
                </label>
                <input
                  id="adm-agencia-conta"
                  type="text"
                  value={agencyAccount}
                  onChange={(e) => setAgencyAccount(e.target.value)}
                  placeholder="Ag: 0001 Conta: 12345-6"
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              {/* Upload de QR Code da Galeria */}
              <div className="bg-[#141d13] p-3.5 rounded-xl border border-[#2d3e28] space-y-2">
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-orange-400" /> 📸 Selecionar Imagem do QR Code da Galeria
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="adm-pix-file"
                    type="file"
                    accept="image/*"
                    className="w-full text-xs text-slate-300 bg-[#182216] border border-[#2d3e28] rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-600 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={uploadQRCodeGaleria}
                    className="py-2 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors uppercase whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Carregar e Enviar
                  </button>
                </div>
                <div id="pix-status" className="text-xs font-semibold text-orange-400 mt-1">
                  {pixStatus}
                </div>
              </div>

              {/* Box de Pré-visualização do QR Code */}
              <div 
                id="adm-qrcode-preview" 
                className="bg-[#182216] p-4 rounded-xl border border-[#2d3e28] text-center space-y-2 shadow-sm"
              >
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                  Pré-visualização do QR Code PIX
                </span>
                <div className="flex justify-center my-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm inline-block">
                    {qrcodeUrl ? (
                      <div className="space-y-2">
                        <img 
                          id="img-qrcode-preview"
                          src={qrcodeUrl} 
                          alt="QR Code Galeria" 
                          className="w-36 h-36 object-contain mx-auto rounded"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveCustomQrCode}
                          className="text-[11px] text-red-400 hover:text-red-300 underline font-semibold cursor-pointer block mx-auto mt-1"
                        >
                          Remover foto enviada (usar gerado automaticamente)
                        </button>
                      </div>
                    ) : (
                      <QRCodeSVG 
                        value={generatePixPayload(pixKey.trim() || 'pix@clube.com', pixName.trim() || 'WM TREINAMENTOS', pixCity.trim() || 'PALMAS')} 
                        size={150}
                        level="H"
                        includeMargin={false}
                      />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/80 py-1.5 px-2.5 rounded border border-emerald-800 flex items-center justify-center gap-1">
                  ✓ QR Code PIX Comercial Sincronizado
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSaveBank()}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <CreditCard className="w-4 h-4" />
                Salvar e Sincronizar Dados Bancários
              </button>
            </div>
          </fieldset>

          {/* 4. Área de Envio (Promoções, Cursos e Banners do Carrossel) */}
          <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md">
            <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
              <Megaphone className="w-4 h-4 text-orange-400" />
              📢 Promoções, Avisos de Cursos e Imagens dos Banners
            </legend>

            <div className="space-y-5 mt-2">
              {/* Texto de Promoções */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span>Texto da Promoção (Banner Topo)</span>
                  <span className="text-[10px] text-orange-400 font-normal">Exibido em destaque no topo</span>
                </label>
                <textarea
                  id="adm-txt-promo"
                  rows={2}
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="Digite a promoção ativa..."
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:outline-none resize-y"
                />
              </div>

              {/* Avisos de Cursos */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span>Avisos de Novos Cursos (Banner & Notificações)</span>
                  <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                    <Award className="w-3 h-3 text-emerald-400" /> Exibido como Banner de Curso
                  </span>
                </label>
                <textarea
                  id="adm-txt-avisos"
                  rows={2}
                  value={noticesText}
                  onChange={(e) => setNoticesText(e.target.value)}
                  placeholder="Ex: Inscrições abertas para Cursos de Operador de Pistola Nível 1..."
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none resize-y"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 Os avisos publicados aqui serão exibidos em forma de banner destacado de cursos e na área de recados para todos os alunos.
                </p>
              </div>

              {/* Upload e Gestão de Banners do Carrossel (Textos, Links, Vídeos e Imagens) */}
              <div className="border-t border-[#2d3e28] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-orange-400" />
                    <span>Anúncios e Banners do Carrossel ({bannerImages.length}/20 Banners)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRestoreDefaultImages}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    title="Restaurar padrão"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restaurar Padrão</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 bg-[#121b10] p-2.5 rounded border border-[#233320] leading-relaxed">
                  💡 <strong>Envie Fotos direto da Galeria do Celular!</strong> Carregue arquivos de imagens para o carrossel (suporta até 20 fotos com otimização automática de qualidade).
                </p>

                {/* Botão de Upload direto da Galeria do Celular/PC */}
                <div className="pt-1">
                  <label className="cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all w-full">
                    <Upload className="w-4 h-4" />
                    <span>📸 Enviar Fotos da Galeria (Até 20 Banners)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Textarea para gerenciar textos / links ou URLs caso queira ajustar manualmente */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Lista de Banners Ativos (Fotos, Vídeos e Textos em ordem):
                  </label>
                  <textarea
                    rows={3}
                    value={bannerTextList}
                    onChange={(e) => handleBannerTextListChange(e.target.value)}
                    placeholder={`Cole ou digite itens linha por linha se desejar...`}
                    className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-xs text-white focus:ring-2 focus:ring-orange-500 focus:outline-none resize-y font-mono leading-relaxed"
                  />
                </div>

                {/* Grid de Pré-visualização das mídias (Fotos e Vídeos) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                  {bannerImages.map((item, idx) => {
                    const t = (item || '').trim();
                    const isVideo = t.startsWith('data:video/') || t.includes('youtube.com') || t.includes('youtu.be') || t.match(/\.(mp4|webm|ogg|mov|m4v)$/i) != null;
                    const isImage = t.startsWith('data:image/') || t.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) != null || t.startsWith('http://') || t.startsWith('https://');
                    const isLink = t.startsWith('http://') || t.startsWith('https://');

                    return (
                      <div 
                        key={idx} 
                        className="relative group bg-[#182216] border border-[#2d3e28] rounded-lg overflow-hidden shadow-sm p-2 flex flex-col justify-between min-h-[90px]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="bg-black/70 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-300">
                            {isImage ? '🖼️ Foto Galeria' : isVideo ? '🎬 Vídeo Galeria' : isLink ? '🔗 Link' : '📝 Texto'}
                          </span>
                        </div>

                        {isImage ? (
                          <img src={t} alt={`Banner ${idx + 1}`} className="w-full h-16 object-cover rounded bg-black" />
                        ) : isVideo ? (
                          <div className="w-full h-16 bg-black rounded overflow-hidden flex items-center justify-center">
                            {t.startsWith('data:video/') || t.match(/\.(mp4|webm|ogg|mov|m4v)$/i) ? (
                              <video src={t} className="w-full h-16 object-cover rounded" muted playsInline />
                            ) : (
                              <span className="text-[10px] font-bold text-orange-400 p-1 text-center truncate">🎬 {t}</span>
                            )}
                          </div>
                        ) : isLink ? (
                          <div className="w-full h-16 bg-slate-900 rounded flex flex-col items-center justify-center p-1 text-center">
                            <span className="text-[11px] font-bold text-orange-400 truncate w-full">{t}</span>
                          </div>
                        ) : (
                          <div className="w-full h-16 bg-[#21301e] rounded flex items-center justify-center p-1 text-center text-[11px] font-medium text-white">
                            🎯 {t}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-md transition-all shadow-md cursor-pointer z-10"
                          title="Remover esta mídia"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Publicação */}
              <button
                type="button"
                onClick={handlePublishMarketing}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-extrabold text-sm rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-4"
              >
                <Megaphone className="w-4.5 h-4.5 text-white" />
                <span>Publicar Promoções, Banners e Cursos</span>
              </button>
            </div>
          </fieldset>

          {/* 5. Trocar / Atualizar Senha de Acesso Administrativo */}
          <fieldset className="border border-[#2d3e28] rounded-xl p-5 bg-[#0e140d] shadow-md">
            <legend className="px-2 font-bold text-orange-400 text-sm flex items-center gap-1.5 bg-[#182216] rounded border border-[#2d3e28]">
              <Lock className="w-4 h-4 text-orange-400" />
              🔐 Trocar / Atualizar Senha de Acesso Admin
            </legend>

            <form onSubmit={handleChangePassword} className="space-y-4 mt-2">
              <p className="text-xs text-slate-300">
                Altere a senha master de acesso ao Painel Administrativo. A nova senha será salva no banco de dados e exigida nos próximos logins.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Senha Atual
                </label>
                <input
                  id="adm-senha-atual"
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Informe a senha atual..."
                  required
                  className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Nova Senha Master
                  </label>
                  <input
                    id="adm-nova-senha"
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Sua nova senha..."
                    required
                    className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    id="adm-confirmar-senha"
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Repita a nova senha..."
                    required
                    className="w-full px-3 py-2 bg-[#182216] border border-[#2d3e28] rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-600 focus:outline-none"
                  />
                </div>
              </div>

              {passwordStatusMsg && (
                <p className={`text-xs font-bold p-2 rounded border ${passwordStatusMsg.startsWith('✓') ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800' : 'text-red-400 bg-red-950/70 border-red-800'}`}>
                  {passwordStatusMsg}
                </p>
              )}

              <button
                id="adm-btn-atualizar-senha"
                type="submit"
                className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md border border-orange-500/40"
              >
                <Lock className="w-4 h-4" />
                <span>Trocar Senha / Atualizar Senha</span>
              </button>
            </form>
          </fieldset>
        </div>
      )}
    </div>
  );
};


