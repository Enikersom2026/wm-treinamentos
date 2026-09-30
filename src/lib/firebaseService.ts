import { 
  doc, 
  setDoc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  collection, 
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { firestore, auth } from './firebase';
import { 
  CompanySettings, 
  BankSettings, 
  MarketingSettings, 
  Instructor, 
  Booking, 
  UserProfile,
  ClientNotification 
} from '../types';
import { generatePixPayload } from './pixUtils';

// Helper function to remove undefined fields from an object before sending to Firestore
function cleanUndefinedFields<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
}

// Default initial data for database seed if empty
const DEFAULT_COMPANY: CompanySettings = { name: 'Clube Alvo Certo' };
const DEFAULT_BANK: BankSettings = {
  pixKey: 'pix@clube.com',
  pixName: 'WM TREINAMENTOS',
  pixCity: 'PALMAS',
  bank: 'Banco do Brasil',
  agencyAccount: 'Ag: 0001 Conta: 12345-6',
};
const DEFAULT_MARKETING: MarketingSettings = {
  bannerText: '🎯 PROMOÇÃO DA SEMANA: 15% OFF em munição recarregada de 9mm! Use o cupom PROMO15 no balcão.',
  noticesText: 'Avisos de Novos Cursos: Inscrições abertas para Operador de Pistola Nível 1 no próximo sábado!',
  bannerImages: [
    'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1584282481015-84242828b85b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80'
  ],
};
const DEFAULT_INSTRUCTORS: Instructor[] = [
  { id: 'inst-1', name: 'Sargento Silva', iatNumber: 'IAT-88231' },
  { id: 'inst-2', name: 'Capitão Oliveira', iatNumber: 'IAT-44102' },
];
const DEFAULT_BOOKINGS: Booking[] = [];

// Subscribe to real-time Settings updates
export function subscribeSettings(
  onCompany: (data: CompanySettings) => void,
  onBank: (data: BankSettings) => void,
  onMarketing: (data: MarketingSettings) => void
) {
  const unsubCompany = onSnapshot(doc(firestore, 'settings', 'empresa'), (snapshot) => {
    if (snapshot.exists()) {
      onCompany(snapshot.data() as CompanySettings);
    } else {
      setDoc(doc(firestore, 'settings', 'empresa'), cleanUndefinedFields(DEFAULT_COMPANY));
      onCompany(DEFAULT_COMPANY);
    }
  }, (err) => console.error('Error fetching company settings:', err));

  const unsubBank = onSnapshot(doc(firestore, 'settings', 'banco'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      onBank({
        pixKey: data.pixKey || data.pix || '',
        pixName: data.pixName || data.nome || 'WM TREINAMENTOS',
        pixCity: data.pixCity || data.cidade || 'PALMAS',
        bank: data.bank || '',
        agencyAccount: data.agencyAccount || '',
        qrcodeUrl: data.qrcodeUrl || '',
      });
    } else {
      // Check configuracoes/banco fallback
      getDoc(doc(firestore, 'configuracoes', 'banco')).then((cSnap) => {
        if (cSnap.exists()) {
          const data = cSnap.data();
          onBank({
            pixKey: data.pixKey || data.pix || '',
            pixName: data.pixName || data.nome || 'WM TREINAMENTOS',
            pixCity: data.pixCity || data.cidade || 'PALMAS',
            bank: data.bank || '',
            agencyAccount: data.agencyAccount || '',
            qrcodeUrl: data.qrcodeUrl || '',
          });
        } else {
          setDoc(doc(firestore, 'settings', 'banco'), cleanUndefinedFields(DEFAULT_BANK));
          onBank(DEFAULT_BANK);
        }
      }).catch(() => {
        setDoc(doc(firestore, 'settings', 'banco'), cleanUndefinedFields(DEFAULT_BANK));
        onBank(DEFAULT_BANK);
      });
    }
  }, (err) => console.error('Error fetching bank settings:', err));

  const unsubMarketing = onSnapshot(doc(firestore, 'settings', 'marketing'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const rawBanners = data.banners || data.bannerImages;
      const bannersList = Array.isArray(rawBanners) && rawBanners.length > 0 
        ? rawBanners.filter((b) => typeof b === 'string' && b.trim() !== '')
        : DEFAULT_MARKETING.bannerImages;

      onMarketing({
        bannerText: data.bannerText || '',
        noticesText: data.noticesText || data.avisos || '',
        bannerImages: bannersList,
      });
    } else {
      // Check configuracoes/marketing fallback
      getDoc(doc(firestore, 'configuracoes', 'marketing')).then((cSnap) => {
        if (cSnap.exists()) {
          const data = cSnap.data();
          const rawBanners = data.banners || data.bannerImages;
          const bannersList = Array.isArray(rawBanners) && rawBanners.length > 0 
            ? rawBanners.filter((b) => typeof b === 'string' && b.trim() !== '')
            : DEFAULT_MARKETING.bannerImages;

          onMarketing({
            bannerText: data.bannerText || '',
            noticesText: data.noticesText || data.avisos || '',
            bannerImages: bannersList,
          });
        } else {
          setDoc(doc(firestore, 'settings', 'marketing'), cleanUndefinedFields(DEFAULT_MARKETING));
          onMarketing(DEFAULT_MARKETING);
        }
      }).catch(() => {
        setDoc(doc(firestore, 'settings', 'marketing'), cleanUndefinedFields(DEFAULT_MARKETING));
        onMarketing(DEFAULT_MARKETING);
      });
    }
  }, (err) => console.error('Error fetching marketing settings:', err));

  return () => {
    unsubCompany();
    unsubBank();
    unsubMarketing();
  };
}

// Subscribe to real-time Schedule Settings (blocked time slots)
export function subscribeScheduleSettings(onSchedule: (blockedSlots: string[]) => void) {
  return onSnapshot(doc(firestore, 'settings', 'horarios'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      onSchedule(Array.isArray(data.blockedSlots) ? data.blockedSlots : []);
    } else {
      // Also check configuracoes/horarios fallback
      getDoc(doc(firestore, 'configuracoes', 'horarios')).then((cSnap) => {
        if (cSnap.exists()) {
          const data = cSnap.data();
          onSchedule(Array.isArray(data.blockedSlots) ? data.blockedSlots : []);
        } else {
          onSchedule([]);
        }
      }).catch(() => {
        onSchedule([]);
      });
    }
  }, (err) => console.error('Error fetching schedule settings:', err));
}

// Save/Update blocked time slots in Firestore
export async function updateScheduleSettings(blockedSlots: string[]): Promise<void> {
  try {
    await setDoc(doc(firestore, 'settings', 'horarios'), { blockedSlots });
    console.log('Bloqueio de horários atualizado no Firestore:', blockedSlots);
  } catch (err) {
    console.error('Error updating schedule settings:', err);
    throw err;
  }
}

// Subscribe to real-time Instructors list
export function subscribeInstructors(onInstructors: (data: Instructor[]) => void) {
  return onSnapshot(collection(firestore, 'instrutores'), (snapshot) => {
    if (snapshot.empty) {
      onInstructors(DEFAULT_INSTRUCTORS);
    } else {
      const list: Instructor[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Instructor);
      });
      onInstructors(list);
    }
  }, (err) => console.error('Error fetching instructors:', err));
}

// Subscribe to real-time Bookings list
export function subscribeBookings(onBookings: (data: Booking[]) => void) {
  return onSnapshot(collection(firestore, 'agendamentos'), (snapshot) => {
    if (snapshot.empty) {
      onBookings([]);
    } else {
      const list: Booking[] = [];
      snapshot.forEach((docSnap) => {
        const bData = { id: docSnap.id, ...docSnap.data() } as Booking;
        list.push(bData);
      });
      // Sort newest first
      list.sort((a, b) => b.id.localeCompare(a.id));
      onBookings(list);
    }
  }, (err) => console.error('Error fetching bookings:', err));
}

// Subscribe to real-time Permanent Booking History list
export function subscribeBookingHistory(onHistory: (data: Booking[]) => void) {
  return onSnapshot(collection(firestore, 'historico_agendamentos'), (snapshot) => {
    const list: Booking[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Booking);
    });
    // Sort newest first
    list.sort((a, b) => b.id.localeCompare(a.id));
    onHistory(list);
  }, (err) => console.error('Error fetching booking history:', err));
}

// Subscribe to real-time Clients list
export function subscribeClients(onClients: (data: UserProfile[]) => void) {
  return onSnapshot(collection(firestore, 'clientes'), (snapshot) => {
    const list: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
    });
    onClients(list);
  }, (err) => console.error('Error fetching clients:', err));
}

// Subscribe to real-time Client Notifications (Alertas de alteração de status)
export function subscribeClientNotifications(
  userEmailOrName: string,
  onNotifications: (data: ClientNotification[]) => void
) {
  return onSnapshot(collection(firestore, 'notificacoes_clientes'), (snapshot) => {
    const list: ClientNotification[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as ClientNotification);
    });
    // Sort newest first
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // Filter for current user if email or name provided
    if (userEmailOrName && userEmailOrName.trim()) {
      const target = userEmailOrName.toLowerCase().trim();
      const userList = list.filter((n) => {
        const nEmail = (n.userEmail || '').toLowerCase().trim();
        const nName = (n.userName || '').toLowerCase().trim();
        return nEmail === target || nName === target || (target && nEmail.includes(target)) || (target && nName.includes(target));
      });
      onNotifications(userList);
    } else {
      onNotifications(list);
    }
  }, (err) => console.error('Error fetching client notifications:', err));
}

// Save/create notification in DB
export async function createClientNotificationInDb(notification: ClientNotification) {
  try {
    const cleaned = cleanUndefinedFields(notification);
    await setDoc(doc(firestore, 'notificacoes_clientes', notification.id), cleaned);
  } catch (err) {
    console.error('Error saving notification in DB:', err);
  }
}

// Mark a single notification as read
export async function markNotificationAsReadInDb(notificationId: string) {
  try {
    await updateDoc(doc(firestore, 'notificacoes_clientes', notificationId), {
      read: true,
      readAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error marking notification as read in DB:', err);
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsReadInDb(notificationIds: string[]) {
  try {
    await Promise.all(
      notificationIds.map((id) =>
        updateDoc(doc(firestore, 'notificacoes_clientes', id), {
          read: true,
          readAt: new Date().toISOString(),
        }).catch(() => {})
      )
    );
  } catch (err) {
    console.error('Error marking all notifications as read in DB:', err);
  }
}

// Save company settings
export async function saveCompanySettingsInDb(settings: CompanySettings) {
  await setDoc(doc(firestore, 'settings', 'empresa'), cleanUndefinedFields(settings));
}

// Save bank settings
export async function saveBankSettingsInDb(settings: BankSettings) {
  const pixKeyClean = settings.pixKey || '';
  const pixNameClean = settings.pixName || 'WM TREINAMENTOS';
  const pixCityClean = settings.pixCity || 'PALMAS';

  const pixPayload = generatePixPayload(pixKeyClean, pixNameClean, pixCityClean);
  const urlQRCode = settings.qrcodeUrl || (pixPayload ? `https://qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pixPayload)}&size=250x250` : '');

  const dataToSave = cleanUndefinedFields({
    pixKey: pixKeyClean,
    pix: pixKeyClean,
    pixName: pixNameClean,
    pixCity: pixCityClean,
    pixPayload: pixPayload,
    bank: settings.bank || '',
    agencyAccount: settings.agencyAccount || '',
    qrcodeUrl: urlQRCode,
  });

  await setDoc(doc(firestore, 'settings', 'banco'), dataToSave);
  await setDoc(doc(firestore, 'configuracoes', 'banco'), dataToSave);
}

// Save marketing settings (stores native array for banners and notices text so carousel never breaks)
export async function saveMarketingSettingsInDb(settings: MarketingSettings) {
  const bannersArray = settings.bannerImages && Array.isArray(settings.bannerImages)
    ? settings.bannerImages.filter((img) => typeof img === 'string' && img.trim() !== '')
    : [];

  const dataToSave = cleanUndefinedFields({
    bannerText: settings.bannerText || '',
    promoText: settings.bannerText || '',
    noticesText: settings.noticesText || '',
    bannerImages: bannersArray,
    banners: bannersArray, // Native array stored directly in Firestore
    avisos: settings.noticesText || '',
  });

  await setDoc(doc(firestore, 'settings', 'marketing'), dataToSave);
  await setDoc(doc(firestore, 'configuracoes', 'marketing'), dataToSave);
}

// Subscribe to real-time Admin Credentials (password & email)
export function subscribeAdminCredentials(onAdminCredentials: (data: { password?: string; email?: string }) => void) {
  return onSnapshot(doc(firestore, 'settings', 'admin'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      onAdminCredentials({
        password: data.password || '311982',
        email: data.email || 'williammoreiradacruz4@gmail.com',
      });
    } else {
      // Check configuracoes/admin fallback
      getDoc(doc(firestore, 'configuracoes', 'admin')).then((cSnap) => {
        if (cSnap.exists()) {
          const data = cSnap.data();
          onAdminCredentials({
            password: data.password || '311982',
            email: data.email || 'williammoreiradacruz4@gmail.com',
          });
        } else {
          onAdminCredentials({ password: '311982', email: 'williammoreiradacruz4@gmail.com' });
        }
      }).catch(() => {
        onAdminCredentials({ password: '311982', email: 'williammoreiradacruz4@gmail.com' });
      });
    }
  }, (err) => console.error('Error fetching admin credentials:', err));
}

// Save Admin Credentials in Firestore
export async function saveAdminCredentialsInDb(credentials: { password?: string; email?: string }) {
  const dataToSave = cleanUndefinedFields({
    password: credentials.password || '311982',
    email: credentials.email || 'williammoreiradacruz4@gmail.com',
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(firestore, 'settings', 'admin'), dataToSave);
  await setDoc(doc(firestore, 'configuracoes', 'admin'), dataToSave);
}

// Save/add instructor
export async function addInstructorInDb(instructor: Instructor) {
  await setDoc(doc(firestore, 'instrutores', instructor.id), cleanUndefinedFields(instructor));
}

// Delete instructor
export async function deleteInstructorFromDb(id: string) {
  await deleteDoc(doc(firestore, 'instrutores', id));
}

// Create new booking (Saves to active agendamentos AND permanent historico_agendamentos)
export async function createBookingInDb(booking: Booking) {
  const cleaned = cleanUndefinedFields({
    ...booking,
    savedAt: new Date().toISOString(),
  });
  // Save to active agendamentos
  await setDoc(doc(firestore, 'agendamentos', booking.id), cleaned);
  // Save PERMANENTLY to historico_agendamentos
  await setDoc(doc(firestore, 'historico_agendamentos', booking.id), cleaned);
}

// Update booking status (Updates active agendamentos AND permanent historico_agendamentos, and logs real-time Client Notification)
export async function updateBookingStatusInDb(
  id: string, 
  status: string,
  bookingDetails?: Partial<Booking>,
  adminNote?: string
) {
  const now = new Date().toISOString();
  const updatePayload = cleanUndefinedFields({ 
    status,
    updatedAt: now,
    updatedBy: 'Administrador',
    adminNote: adminNote || '',
    previousStatus: bookingDetails?.status,
  });

  await updateDoc(doc(firestore, 'agendamentos', id), updatePayload).catch(() => {});
  await setDoc(doc(firestore, 'historico_agendamentos', id), updatePayload, { merge: true });

  // Generate real-time client notification
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '_');
  const notifId = `notif_${Date.now()}_${cleanId}`;
  const notifData: ClientNotification = {
    id: notifId,
    bookingId: id,
    userName: bookingDetails?.userName || '',
    userEmail: bookingDetails?.userEmail || '',
    date: bookingDetails?.date || '',
    shift: bookingDetails?.shift || '',
    oldStatus: bookingDetails?.status || 'Aguardando Confirmação',
    newStatus: status,
    adminNote: adminNote || '',
    message: `Seu agendamento para ${bookingDetails?.date || ''} (${bookingDetails?.shift || ''}) foi ${status.toUpperCase()} pelo administrador.`,
    createdAt: now,
    read: false,
  };

  await createClientNotificationInDb(notifData).catch((err) => {
    console.error('Erro ao registrar notificação para o cliente:', err);
  });
}

// Delete booking (Removes from active agendamentos, BUT keeps in historico_agendamentos with status 'Cancelado / Removido')
export async function deleteBookingFromDb(id: string) {
  await deleteDoc(doc(firestore, 'agendamentos', id));
  // Keep in history! Update status so history record is NEVER lost!
  await setDoc(doc(firestore, 'historico_agendamentos', id), {
    status: 'Excluído do Painel / Histórico Salvo',
    deletedFromActive: true,
    deletedAt: new Date().toISOString()
  }, { merge: true });
}

// Save client profile (Saves to BOTH 'clientes' AND 'users' collections in Firestore)
export async function saveClientInDb(client: UserProfile) {
  const emailKey = client.email ? client.email.trim().toLowerCase() : `client_${Date.now()}`;
  const docId = emailKey.replace(/[/.]/g, '_');
  
  const clientData = cleanUndefinedFields({
    ...client,
    email: emailKey,
    updatedAt: new Date().toISOString(),
  });

  // Save to 'clientes' collection
  await setDoc(doc(firestore, 'clientes', docId), clientData, { merge: true });
  // ALSO save to 'users' collection so both collections stay updated
  await setDoc(doc(firestore, 'users', docId), clientData, { merge: true });

  // If CPF is available, also set doc by CPF in both collections if needed
  if (client.cpf) {
    const cpfDocId = client.cpf.trim().replace(/\D/g, '');
    if (cpfDocId) {
      await setDoc(doc(firestore, 'clientes', cpfDocId), clientData, { merge: true }).catch(() => {});
      await setDoc(doc(firestore, 'users', cpfDocId), clientData, { merge: true }).catch(() => {});
    }
  }
}

// Delete client profile from Firestore (Deletes from both 'clientes' and 'users')
export async function deleteClientFromDb(clientOrId: string | UserProfile) {
  let docId = typeof clientOrId === 'string' ? clientOrId : (clientOrId.id || clientOrId.email || '');
  if (!docId) return;
  if (docId.includes('@') || docId.includes('.')) {
    docId = docId.trim().toLowerCase().replace(/[/.]/g, '_');
  }
  await deleteDoc(doc(firestore, 'clientes', docId)).catch(() => {});
  await deleteDoc(doc(firestore, 'users', docId)).catch(() => {});
}

// Register user with Firebase Auth and save profile to Firestore
export async function registerUserWithAuth(userProfile: UserProfile): Promise<UserProfile> {
  const emailClean = userProfile.email ? userProfile.email.trim().toLowerCase() : '';
  if (emailClean && userProfile.password) {
    if (userProfile.password.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres para cadastro no Firebase Authentication.');
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailClean, userProfile.password);
      console.log('Usuário cadastrado com sucesso no Firebase Authentication:', userCredential.user.email);
    } catch (err: any) {
      console.warn('Firebase Auth registration note:', err?.code, err?.message);
      if (err?.code === 'auth/email-already-in-use') {
        console.log('E-mail já registrado no Firebase Authentication.');
      } else if (err?.code === 'auth/weak-password') {
        throw new Error('A senha deve ter pelo menos 6 caracteres.');
      } else if (err?.code === 'auth/invalid-email') {
        throw new Error('E-mail em formato inválido.');
      }
    }
  }
  const profileToSave = { ...userProfile, email: emailClean || userProfile.email };
  await saveClientInDb(profileToSave);
  return profileToSave;
}

// Login user with Firebase Auth / Firestore profile
export async function loginUserWithAuth(email: string, password?: string): Promise<UserProfile | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const docId = normalizedEmail.replace(/[/.]/g, '_');
  
  if (password && password.length >= 6) {
    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      console.log('Login efetuado com sucesso no Firebase Authentication:', normalizedEmail);
    } catch (err: any) {
      console.warn('Firebase Auth sign in note:', err?.code, err?.message);
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        // Automatically attempt registration in Firebase Auth if user didn't exist in Auth yet
        try {
          await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          console.log('Usuário registrado automaticamente no Firebase Authentication durante login:', normalizedEmail);
        } catch (createErr) {
          console.warn('Auto create in Auth note:', createErr);
        }
      }
    }
  }

  let foundProfile: UserProfile | null = null;

  // 1. Try direct doc lookup by docId in 'clientes' or 'users'
  try {
    const snap = await getDoc(doc(firestore, 'clientes', docId));
    if (snap.exists()) {
      foundProfile = snap.data() as UserProfile;
    } else {
      const snapUsers = await getDoc(doc(firestore, 'users', docId));
      if (snapUsers.exists()) {
        foundProfile = snapUsers.data() as UserProfile;
      }
    }
  } catch (err) {
    console.error('Error fetching client profile by docId:', err);
  }

  // 2. Query fallback: search by email field in 'clientes' collection
  if (!foundProfile) {
    try {
      const qEmail = query(collection(firestore, 'clientes'), where('email', '==', normalizedEmail));
      const querySnap = await getDocs(qEmail);
      if (!querySnap.empty) {
        foundProfile = querySnap.docs[0].data() as UserProfile;
      }
    } catch (err) {
      console.error('Error querying client by email:', err);
    }
  }

  // 3. Query fallback: search by CPF field in 'clientes' collection
  if (!foundProfile) {
    try {
      const qCpf = query(collection(firestore, 'clientes'), where('cpf', '==', email.trim()));
      const querySnap = await getDocs(qCpf);
      if (!querySnap.empty) {
        foundProfile = querySnap.docs[0].data() as UserProfile;
      }
    } catch (err) {
      console.error('Error querying client by cpf:', err);
    }
  }

  // If profile was found or newly logged in, ensure profile is saved in both 'clientes' and 'users'
  if (foundProfile) {
    await saveClientInDb(foundProfile);
  }

  return foundProfile;
}

// Global window.app helper object for admin and client functions as requested
if (typeof window !== 'undefined') {
  let carouselInterval: any = null;
  let usuarioLogado: any = null;

  const showView = (viewId: string) => {
    const views = ['c-login', 'c-main', 'c-cadastro'];
    views.forEach((v) => {
      const el = document.getElementById(v);
      if (el) el.style.display = v === viewId ? 'block' : 'none';
    });
  };

  (window as any).app = {
    gerarEEnviarQRCode: function() {
      const pixEl = document.getElementById('adm-pix') as HTMLInputElement;
      const chavePix = pixEl ? pixEl.value.trim() : '';
      const previewBox = document.getElementById('adm-qrcode-preview');
      const imgPreview = document.getElementById('img-qrcode-preview') as HTMLImageElement;

      if (chavePix.length > 4) {
        const urlQRCode = `https://qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(chavePix)}&size=200x200`;
        if (imgPreview) imgPreview.src = urlQRCode;
        if (previewBox) previewBox.style.display = 'block';

        saveBankSettingsInDb({
          pixKey: chavePix,
          bank: 'Banco do Brasil',
          agencyAccount: 'Ag: 0001 Conta: 12345-6',
          qrcodeUrl: urlQRCode
        });
      } else {
        if (previewBox) previewBox.style.display = 'none';
        deleteDoc(doc(firestore, 'configuracoes', 'banco')).catch(() => {});
        deleteDoc(doc(firestore, 'settings', 'banco')).catch(() => {});
      }
    },

    publicarMarketing: function() {
      const promoEl = document.getElementById('adm-txt-promo') as HTMLTextAreaElement | HTMLInputElement;
      const avisosEl = document.getElementById('adm-txt-avisos') as HTMLTextAreaElement | HTMLInputElement;
      
      const textoCarrossel = promoEl ? promoEl.value : '';
      const listaBanners = textoCarrossel.split('\n').map((l) => l.trim()).filter((l) => l !== '');
      const textoAvisos = avisosEl ? avisosEl.value.trim() : '';

      saveMarketingSettingsInDb({
        bannerText: textoAvisos,
        noticesText: textoAvisos,
        bannerImages: listaBanners.length > 0 ? listaBanners : DEFAULT_MARKETING.bannerImages
      }).then(() => {
        alert('Sucesso! Banners e anúncios sincronizados via Firestore.');
      }).catch((error: any) => {
        alert('Erro ao salvar no Firestore: ' + (error?.message || error));
      });
    },

    mudarStatusAgendamento: function(idDocumento: string, acao: string) {
      if (acao === 'Excluir') {
        if (confirm("Deseja realmente excluir este agendamento definitivamente do banco?")) {
          deleteDoc(doc(firestore, 'agendamentos', idDocumento))
            .then(() => alert('Agendamento removido com sucesso!'))
            .catch((error: any) => alert('Erro ao excluir: ' + (error?.message || error)));
        }
      } else {
        updateDoc(doc(firestore, 'agendamentos', idDocumento), {
          status: acao
        }).then(() => alert('Status do agendamento atualizado!'))
          .catch((error: any) => alert('Erro ao atualizar: ' + (error?.message || error)));
      }
    },

    escutarAgendamentosAdmin: function() {
      return onSnapshot(collection(firestore, 'agendamentos'), (snapshot) => {
        const box = document.getElementById('adm-lista-agendamentos');
        if (!box) return;
        box.innerHTML = '';
        
        if (snapshot.empty) {
          box.innerHTML = '<p style="font-size:12px;color:#7f8c8d;">Nenhum agendamento ativo.</p>';
          return;
        }

        snapshot.forEach((docSnap) => {
          const ag = docSnap.data();
          const idDoc = docSnap.id; // Captura o ID real do documento no Firestore
          
          box.innerHTML += `
            <div class="item-list" style="border-left:4px solid var(--laranja, #ea580c); padding:8px; margin-bottom:8px; background:#182216; border-radius:6px; color:#fff; font-size:12px;">
              <strong>Atirador:</strong> ${ag.cliente || ag.userName || 'Atirador'}<br>
              <strong>Loja de Indicação:</strong> <span style="color:var(--laranja, #f97316); font-weight:bold;">${ag.lojaIndicou || 'Nenhuma'}</span><br>
              <strong>Data/Turno:</strong> ${ag.data || ag.date || ''} (${ag.turno || ag.shift || ''})<br>
              <strong>Status:</strong> <em>${ag.status}</em><br>
              <div style="margin-top: 10px; display: flex; gap: 5px;">
                <button class="btn-success" style="padding:6px 12px; font-size:11px; margin:0; background:#16a34a; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="app.mudarStatusAgendamento('${idDoc}', 'Confirmado')">Aprovar</button>
                <button class="btn-danger" style="padding:6px 12px; font-size:11px; margin:0; background:#dc2626; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="app.mudarStatusAgendamento('${idDoc}', 'Excluir')">Excluir</button>
              </div>
            </div>`;
        });
      });
    },

    excluirCliente: function(cpfCliente: string) {
      if (confirm(`Tem certeza que deseja remover o cadastro do CPF ${cpfCliente} do sistema?`)) {
        deleteDoc(doc(firestore, 'clientes', cpfCliente))
          .then(() => {
            deleteDoc(doc(firestore, 'users', cpfCliente)).catch(() => {});
            alert('Cliente excluído com sucesso do banco de dados!');
          })
          .catch((error: any) => alert('Erro ao remover cliente: ' + (error?.message || error)));
      }
    },

    escutarClientesAdmin: function() {
      return onSnapshot(collection(firestore, 'clientes'), (snapshot) => {
        const box = document.getElementById('adm-lista-clientes');
        if (!box) return;
        box.innerHTML = '';
        
        if (snapshot.empty) {
          box.innerHTML = '<p style="font-size:12px;color:#7f8c8d;">Nenhum cliente cadastrado.</p>';
          return;
        }

        snapshot.forEach((docSnap) => {
          const cliente = docSnap.data();
          const docId = docSnap.id;
          const cpfVal = cliente.cpf || docId;
          box.innerHTML += `
            <div class="item-list" style="border-left:4px solid var(--militar, #15803d); padding:8px; margin-bottom:8px; background:#182216; border-radius:6px; color:#fff; font-size:12px;">
              <strong>Nome:</strong> ${cliente.nome || cliente.name || 'Cliente'}<br>
              <strong>CPF:</strong> ${cpfVal} | <strong>Zap:</strong> ${cliente.tel || cliente.phone || 'N/A'}<br>
              <strong>Indicação:</strong> ${cliente.loja || cliente.referredByStore || 'Direto'}<br>
              <button class="btn-danger" style="padding:4px 8px; font-size:11px; width:auto; margin-top:5px; background:#dc2626; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="app.excluirCliente('${docId}')">Excluir Perfil</button>
            </div>`;
        });
      });
    },

    carregarTelaAdmin: function() {
      getDoc(doc(firestore, 'configuracoes', 'banco')).then((snapshot) => {
        if (snapshot.exists() && snapshot.data().pix) {
          const pixEl = document.getElementById('adm-pix') as HTMLInputElement;
          if (pixEl) pixEl.value = snapshot.data().pix;
          (window as any).app.gerarEEnviarQRCode();
        }
      }).catch(() => {});

      getDoc(doc(firestore, 'configuracoes', 'marketing')).then((snapshot) => {
        if (snapshot.exists()) {
          const mkt = snapshot.data();
          const promoEl = document.getElementById('adm-txt-promo') as HTMLTextAreaElement;
          const avisosEl = document.getElementById('adm-txt-avisos') as HTMLTextAreaElement;
          if (mkt.banners && promoEl) promoEl.value = Array.isArray(mkt.banners) ? mkt.banners.join('\n') : mkt.banners;
          if (mkt.avisos && avisosEl) avisosEl.value = mkt.avisos;
        }
      }).catch(() => {});

      (window as any).app.escutarAgendamentosAdmin();
      (window as any).app.escutarClientesAdmin();
    },

    cadastrarCliente: function(e: any) {
      if (e && e.preventDefault) e.preventDefault();
      const cpfEl = document.getElementById('cad-cpf') as HTMLInputElement;
      const nomeEl = document.getElementById('cad-nome') as HTMLInputElement;
      const telEl = document.getElementById('cad-tel') as HTMLInputElement;
      const lojaEl = document.getElementById('cad-loja') as HTMLInputElement;

      const cpf = cpfEl ? cpfEl.value.trim() : '';
      const novo: UserProfile = {
        name: nomeEl ? nomeEl.value : '',
        nome: nomeEl ? nomeEl.value : '',
        email: cpf ? `${cpf}@cliente.local` : 'cliente@cliente.local',
        cpf: cpf,
        phone: telEl ? telEl.value : '',
        tel: telEl ? telEl.value : '',
        loja: lojaEl ? lojaEl.value : '',
        referredByStore: lojaEl ? lojaEl.value : '',
        senha: '123'
      };

      saveClientInDb(novo).then(() => {
        alert('Cadastro gravado no Firestore! Use seu CPF para entrar.');
        showView('c-login');
      }).catch(() => alert('Erro ao salvar cadastro.'));
    },

    loginCliente: function(e: any) {
      if (e && e.preventDefault) e.preventDefault();
      const emailEl = document.getElementById('l-email') as HTMLInputElement;
      const cpfInput = emailEl ? emailEl.value.trim() : '';

      loginUserWithAuth(cpfInput).then((user) => {
        if (user) {
          usuarioLogado = user;
          (window as any).app.carregarTelaCliente();
        } else {
          alert('Atirador não localizado no banco de dados do Firestore.');
        }
      });
    },

    criarAgendamento: function(e: any) {
      if (e && e.preventDefault) e.preventDefault();
      const dataEl = document.getElementById('ag-data') as HTMLInputElement;
      const turnoEl = document.getElementById('ag-turno') as HTMLSelectElement;

      const novoAgendamento: Booking = {
        id: `b-${Date.now().toString().slice(-4)}`,
        userName: usuarioLogado?.nome || usuarioLogado?.name || 'Atirador',
        userEmail: usuarioLogado?.email || usuarioLogado?.cpf || '',
        lojaIndicou: usuarioLogado?.loja || usuarioLogado?.referredByStore || 'Direto/Nenhuma',
        date: dataEl ? dataEl.value : '',
        shift: (turnoEl ? turnoEl.value : 'Manhã') as any,
        status: 'Aguardando Confirmação',
        createdAt: new Date().toISOString().split('T')[0]
      };

      createBookingInDb(novoAgendamento).then(() => {
        alert('Vaga solicitada via Firestore!');
      }).catch(() => alert('Erro ao agendar.'));
    },

    cancelarAgendamentoCliente: function(idDocumento: string) {
      if (confirm("Deseja cancelar esta solicitação de treino?")) {
        deleteDoc(doc(firestore, 'agendamentos', idDocumento))
          .then(() => alert('Agendamento cancelado!'))
          .catch((error: any) => alert('Erro ao cancelar: ' + (error?.message || error)));
      }
    },

    renderizarAgendamentosCliente: function() {
      onSnapshot(collection(firestore, 'agendamentos'), (snapshot) => {
        const lista = document.getElementById('c-meus-agendamentos');
        if (!lista) return;
        lista.innerHTML = '';
        
        const userDocs = snapshot.docs.filter((docSnap) => {
          const ag = docSnap.data();
          if (!usuarioLogado) return true;
          return (
            (usuarioLogado.nome && (ag.cliente === usuarioLogado.nome || ag.userName?.toLowerCase() === usuarioLogado.nome.toLowerCase())) ||
            (usuarioLogado.name && (ag.cliente === usuarioLogado.name || ag.userName?.toLowerCase() === usuarioLogado.name.toLowerCase())) ||
            (usuarioLogado.email && ag.userEmail === usuarioLogado.email)
          );
        });

        if (userDocs.length === 0) {
          lista.innerHTML = '<p style="font-size:12px;color:#7f8c8d;">Nenhuma atividade agendada.</p>';
          return;
        }

        userDocs.forEach((docSnap) => {
          const ag = docSnap.data();
          const idDoc = docSnap.id; // Resgata o ID real do agendamento no Firestore
          
          lista.innerHTML += `
            <div class="item-list p-2.5 my-1 bg-[#182216] border-l-4 border-orange-500 rounded text-xs text-white">
              <strong>Data:</strong> ${ag.data || ag.date || ''} - ${ag.turno || ag.shift || ''}<br>
              <strong>Status atual:</strong> <span style="color:#f97316; font-weight:bold;">${ag.status}</span>
              <button class="btn-danger" style="padding:4px 8px; font-size:11px; width:auto; float:right; margin:0; background:#dc2626; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="app.cancelarAgendamentoCliente('${idDoc}')">Excluir</button>
              <div style="clear:both;"></div>
            </div>`;
        });
      });
    },

    carregarTelaCliente: function() {
      showView('c-main');
      
      // 1. Escuta Dados Bancários / Pix em tempo real no Firestore
      onSnapshot(doc(firestore, 'configuracoes', 'banco'), (docSnap) => {
        const banco = docSnap.data();
        const pixArea = document.getElementById('c-pix-area');
        const chaveEl = document.getElementById('c-pix-chave');
        const qrImgEl = document.getElementById('img-c-qrcode') as HTMLImageElement;

        if (banco && (banco.qrcodeUrl || banco.pix || banco.pixKey)) {
          if (chaveEl) chaveEl.innerText = banco.pix || banco.pixKey || '';
          if (qrImgEl && banco.qrcodeUrl) qrImgEl.src = banco.qrcodeUrl;
          if (pixArea) pixArea.style.display = 'block';
        } else if (pixArea) {
          pixArea.style.display = 'none';
        }
      });

      // 2. CORREÇÃO DE COMUNICAÇÃO INTERCELULAR (Carrossel inteligente de mídia e avisos)
      onSnapshot(doc(firestore, 'configuracoes', 'marketing'), (docSnap) => {
        const mkt = docSnap.data(); 
        const slide = document.getElementById('carousel-slide');
        const wrapper = document.getElementById('c-carousel'); 
        const bAviso = document.getElementById('c-avisos');
        
        if (carouselInterval) clearInterval(carouselInterval);
        if (slide) {
          slide.style.transform = "translateX(0%)"; 
          slide.innerHTML = '';
        }
        
        const banners = mkt?.banners || mkt?.bannerImages;

        if (mkt && Array.isArray(banners) && banners.length > 0 && slide) {
          banners.forEach((item: any) => {
            if (typeof item !== 'string') return;
            const t = item.trim();
            if (!t) return;
            
            // 1. IDENTIFICA SE É VÍDEO DO YOUTUBE (Converte link normal para formato de player embed)
            if (t.includes('youtube.com') || t.includes('youtu.be')) {
              let videoId = "";
              if (t.includes('v=')) videoId = t.split('v=')[1].split('&')[0];
              else if (t.includes('youtu.be/')) videoId = t.split('youtu.be/')[1].split('?')[0];
              
              slide.innerHTML += `
                  <div class="carousel-item" style="padding:0; height:250px;">
                      <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                  </div>`;
            }
            // 2. IDENTIFICA SE É UM VÍDEO DIRETO OU DA GALERIA DO CELULAR (data:video/ ou .mp4, .webm, .mov, etc)
            else if (t.startsWith('data:video/') || t.match(/\.(mp4|webm|ogg|mov|m4v|3gp|quicktime)$/i) != null) {
              slide.innerHTML += `
                  <div class="carousel-item" style="padding:0; height:250px; background:#000;">
                      <video width="100%" height="100%" controls autoplay muted loop playsinline style="object-fit: contain; width:100%; height:100%; max-height:250px;" src="${t}">
                          <source src="${t}">
                      </video>
                  </div>`;
            }
            // 3. IDENTIFICA SE É UMA IMAGEM DA GALERIA DO CELULAR OU DA INTERNET (data:image/ ou .jpg, .png, .webp, http, etc.)
            else if (t.startsWith('data:image/') || t.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) != null || t.startsWith('http://') || t.startsWith('https://')) {
              slide.innerHTML += `
                  <div class="carousel-item" style="padding:0; height:250px;">
                      <img src="${t}" style="width:100%; height:100%; object-fit:cover;" alt="Banner">
                  </div>`;
            }
            // 4. SE FOR APENAS TEXTO COMUM (Mantém o padrão atual)
            else {
              slide.innerHTML += `<div class="carousel-item p-3 text-center text-xs font-semibold text-white bg-slate-800/80 rounded my-1">🎯 ${t}</div>`;
            }
          });
          
          if (wrapper) wrapper.style.display = 'block'; 
          (window as any).app.iniciarCarrossel();
        } else { 
          if (wrapper) wrapper.style.display = 'none'; 
        }
        
        const promo = mkt?.bannerText || mkt?.promoText;
        const bPromo = document.getElementById('c-promocoes');
        if (bPromo && promo && typeof promo === 'string' && promo.trim() !== '') {
          const spanEl = bPromo.querySelector('span');
          if (spanEl) spanEl.innerText = promo;
        }

        const avisos = mkt?.avisos || mkt?.noticesText;
        if (mkt && avisos && typeof avisos === 'string' && avisos.trim() !== '' && bAviso) { 
          bAviso.innerHTML = "<h4>⚠️ AVISOS</h4><p>" + avisos.replace(/\n/g, '<br>') + "</p>"; 
          bAviso.style.display = 'block'; 
        } else if (bAviso) { 
          bAviso.style.display = 'none'; 
        }
      });

      // 3. Escuta e renderiza os agendamentos do cliente em tempo real
      (window as any).app.renderizarAgendamentosCliente();
    },

    iniciarCarrossel: function() {
      const slide = document.getElementById('carousel-slide');
      const itens = document.querySelectorAll('.carousel-item');
      let contador = 0;
      if (itens.length <= 1) return;
      
      carouselInterval = setInterval(() => {
        contador++;
        if (contador >= itens.length) contador = 0;
        if (slide) slide.style.transform = `translateX(${-100 * contador}%)`;
      }, 3000);
    },

    logout: function() {
      usuarioLogado = null;
      showView('c-login');
    }
  };
}

