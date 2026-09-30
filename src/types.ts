export type PortalMode = 'cliente' | 'admin';

export type Screen = 'login' | 'cadastro' | 'main';
export type AdminScreen = 'a-login' | 'a-dashboard';

export type ShiftPeriod = 'm' | 't' | 'n' | string;

export interface Booking {
  id: string;
  userName: string;
  userEmail?: string;
  lojaIndicou?: string;
  date: string; // YYYY-MM-DD or DD/MM/YYYY
  shift: string; // "Manhã (08:00 às 12:00)", "Tarde (13:00 às 18:00)", "Noite (18:00 às 21:00)", etc.
  status: 'Pendente' | 'Confirmado' | 'Aprovado' | 'Cancelado' | 'Aguardando Confirmação' | 'Cancelamento Solicitado' | string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  previousStatus?: string;
  adminNote?: string;
}

export interface ClientNotification {
  id: string;
  bookingId: string;
  userEmail?: string;
  userName?: string;
  date: string;
  shift: string;
  oldStatus?: string;
  newStatus: string;
  message: string;
  createdAt: string;
  read: boolean;
  adminNote?: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  nome?: string;
  email: string;
  cpf: string;
  phone: string;
  tel?: string;
  referredByStore: string;
  loja?: string;
  crNumber?: string;
  crValidity?: string;
  password?: string;
  senha?: string;
}

export interface Instructor {
  id: string;
  name: string;
  iatNumber: string;
}

export interface BankSettings {
  pixKey: string;
  pixName?: string;
  pixCity?: string;
  bank: string;
  agencyAccount: string;
  qrcodeUrl?: string;
}

export interface CompanySettings {
  name: string;
  logoUrl?: string;
}

export interface MarketingSettings {
  bannerText: string;
  noticesText: string;
  bannerImages?: string[];
}

export interface ScheduleSettings {
  blockedSlots: string[];
}

