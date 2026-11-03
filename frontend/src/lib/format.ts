import type { CourseLevel, LessonType, OrderStatus, Role } from '../types/api';

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('id-ID');

export const money = (v: number | null | undefined) => currency.format(Number(v ?? 0));
export const num = (v: number | null | undefined) => number.format(Number(v ?? 0));
export const price = (v: number | null | undefined) => (Number(v ?? 0) === 0 ? 'Gratis' : money(v));

export const formatDate = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(iso)) : '-';
export const formatDateTime = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '-';

export const duration = (minutes?: number | null) => {
  const m = Number(minutes ?? 0);
  if (m <= 0) return '';
  const h = Math.floor(m / 60);
  return h > 0 ? `${h} jam${m % 60 ? ` ${m % 60} mnt` : ''}` : `${m} mnt`;
};

export const levelLabel: Record<CourseLevel, string> = {
  BEGINNER: 'Pemula',
  INTERMEDIATE: 'Menengah',
  ADVANCED: 'Mahir',
  ALL_LEVELS: 'Semua level',
};

export const lessonTypeLabel: Record<LessonType, string> = {
  VIDEO: 'Video',
  TEXT: 'Bacaan',
  PDF: 'PDF',
  QUIZ: 'Kuis',
  ASSIGNMENT: 'Tugas',
};

export const roleLabel: Record<Role, string> = { ADMIN: 'Admin', INSTRUCTOR: 'Instruktur', STUDENT: 'Siswa' };

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Menunggu pembayaran',
  PAID: 'Lunas',
  FAILED: 'Gagal',
  EXPIRED: 'Kedaluwarsa',
  CANCELLED: 'Dibatalkan',
};

export const errorMessage = (err: unknown, fallback = 'Terjadi kesalahan') =>
  err instanceof Error && err.message ? err.message : fallback;

export const PLATFORM_NAME: string = import.meta.env.VITE_PLATFORM_NAME ?? 'Akademi LMS';
