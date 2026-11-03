import type {
  AdminStats, AuthResponse, Category, Certificate, CheckoutResponse, CompletionResponse, CourseDetail, CourseEditor,
  CourseLevel, CourseRequest, CourseStudent, CourseSummary, EditorQuestion, InstructorStats, LearningCourse,
  LessonContent, LessonRequest, MyCourse, Order, QuizResult, Role, Submission, User,
} from '../types/api';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
const TOKEN_KEY = 'lms_token';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Invoked when an authenticated request answers 401 (expired/invalid session). */
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

/** Absolute URL for a relative URL returned by the API (thumbnails etc.). */
export const assetUrl = (relative?: string | null) => (relative ? `${API_URL}${relative}` : null);

async function raw(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 0);
  }
  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    tokenStore.clear();
    onUnauthorized();
  }
  if (!res.ok) {
    let message = `Permintaan gagal (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch { /* not JSON */ }
    if (res.status === 403 && message.startsWith('Permintaan gagal')) message = 'Anda tidak memiliki akses.';
    throw new ApiError(message, res.status);
  }
  return res;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await raw(path, options);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

const upload = <T>(path: string, file: File, extra: Record<string, string> = {}) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(extra).forEach(([k, v]) => form.append(k, v));
  return request<T>(path, { method: 'POST', body: form });
};

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.set(k, String(v)); });
  const str = s.toString();
  return str ? `?${str}` : '';
};

/** Downloads an authenticated file as a blob URL (for PDFs and submissions behind login). */
export async function fetchBlobUrl(path: string): Promise<string> {
  const res = await raw(path);
  return URL.createObjectURL(await res.blob());
}

export async function downloadFile(path: string, fileName: string) {
  const url = await fetchBlobUrl(path);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const api = {
  // auth
  login: (email: string, password: string) => send<AuthResponse>('POST', '/auth/login', { email, password }),
  register: (fullName: string, email: string, password: string, instructor: boolean) =>
    send<AuthResponse>('POST', '/auth/register', { fullName, email, password, instructor }),
  me: () => request<User>('/auth/me'),
  updateProfile: (p: { fullName: string; headline?: string | null; bio?: string | null }) => send<User>('PUT', '/auth/me', p),
  changePassword: (currentPassword: string, newPassword: string) =>
    send<void>('POST', '/auth/change-password', { currentPassword, newPassword }),

  // public
  catalog: (p: { q?: string; category?: string; level?: CourseLevel | ''; price?: string; sort?: string } = {}) =>
    request<CourseSummary[]>(`/public/courses${qs(p)}`),
  course: (slug: string) => request<CourseDetail>(`/public/courses/${encodeURIComponent(slug)}`),
  categories: () => request<Category[]>('/public/categories'),
  previewLesson: (id: number) => request<LessonContent>(`/public/lessons/${id}/preview`),
  verifyCertificate: (code: string) => request<Certificate>(`/public/certificates/${encodeURIComponent(code)}`),
  certificatePdfUrl: (code: string) => `${API_URL}/public/certificates/${encodeURIComponent(code)}/pdf`,
  config: () => request<{ paymentProvider: string }>('/public/config'),

  // student
  enrollFree: (courseId: number) => send<MyCourse>('POST', `/courses/${courseId}/enroll`),
  checkout: (courseId: number) => send<CheckoutResponse>('POST', `/courses/${courseId}/checkout`),
  myCourses: () => request<MyCourse[]>('/me/courses'),
  myCertificates: () => request<Certificate[]>('/me/certificates'),
  myOrders: () => request<Order[]>('/me/orders'),
  order: (code: string) => request<Order>(`/orders/${encodeURIComponent(code)}`),
  simulatePayment: (code: string, pay: boolean) => send<Order>('POST', `/orders/${encodeURIComponent(code)}/simulate${qs({ pay })}`),
  learning: (courseId: number) => request<LearningCourse>(`/learn/courses/${courseId}`),
  lesson: (id: number) => request<LessonContent>(`/learn/lessons/${id}`),
  lessonFilePath: (id: number) => `/learn/lessons/${id}/file`,
  completeLesson: (id: number) => send<CompletionResponse>('POST', `/learn/lessons/${id}/complete`),
  submitQuiz: (id: number, answers: Record<number, number>) => send<QuizResult>('POST', `/learn/lessons/${id}/quiz`, { answers }),
  submitAssignment: (id: number, file: File, note: string) =>
    upload<Submission>(`/learn/lessons/${id}/submission`, file, note ? { note } : {}),
  submissionFilePath: (id: number) => `/submissions/${id}/file`,

  // instructor
  instructorStats: () => request<InstructorStats>('/instructor/stats'),
  instructorCourses: () => request<CourseSummary[]>('/instructor/courses'),
  createCourse: (c: CourseRequest) => send<CourseEditor>('POST', '/instructor/courses', c),
  editor: (id: number) => request<CourseEditor>(`/instructor/courses/${id}`),
  updateCourse: (id: number, c: CourseRequest) => send<CourseEditor>('PUT', `/instructor/courses/${id}`, c),
  deleteCourse: (id: number) => send<void>('DELETE', `/instructor/courses/${id}`),
  uploadThumbnail: (id: number, file: File) => upload<CourseEditor>(`/instructor/courses/${id}/thumbnail`, file),
  publish: (id: number) => send<CourseEditor>('POST', `/instructor/courses/${id}/publish`),
  unpublish: (id: number) => send<CourseEditor>('POST', `/instructor/courses/${id}/unpublish`),
  archive: (id: number) => send<CourseEditor>('POST', `/instructor/courses/${id}/archive`),
  courseStudents: (id: number) => request<CourseStudent[]>(`/instructor/courses/${id}/students`),
  addSection: (courseId: number, title: string) => send<CourseEditor>('POST', `/instructor/courses/${courseId}/sections`, { title }),
  updateSection: (id: number, title: string) => send<CourseEditor>('PUT', `/instructor/sections/${id}`, { title }),
  deleteSection: (id: number) => send<CourseEditor>('DELETE', `/instructor/sections/${id}`),
  moveSection: (id: number, direction: 'UP' | 'DOWN') => send<CourseEditor>('POST', `/instructor/sections/${id}/move`, { direction }),
  addLesson: (sectionId: number, l: LessonRequest) => send<CourseEditor>('POST', `/instructor/sections/${sectionId}/lessons`, l),
  updateLesson: (id: number, l: LessonRequest) => send<CourseEditor>('PUT', `/instructor/lessons/${id}`, l),
  deleteLesson: (id: number) => send<CourseEditor>('DELETE', `/instructor/lessons/${id}`),
  moveLesson: (id: number, direction: 'UP' | 'DOWN') => send<CourseEditor>('POST', `/instructor/lessons/${id}/move`, { direction }),
  uploadLessonFile: (id: number, file: File) => upload<CourseEditor>(`/instructor/lessons/${id}/file`, file),
  saveQuiz: (id: number, questions: EditorQuestion[]) => send<CourseEditor>('PUT', `/instructor/lessons/${id}/quiz`, {
    questions: questions.map((q) => ({ text: q.text, explanation: q.explanation || null, options: q.options.map((o) => ({ text: o.text, correct: o.correct })) })),
  }),
  submissions: () => request<Submission[]>('/instructor/submissions'),
  grade: (id: number, grade: number, feedback: string) => send<Submission>('POST', `/instructor/submissions/${id}/grade`, { grade, feedback }),

  // admin
  adminStats: () => request<AdminStats>('/admin/stats'),
  adminUsers: () => request<User[]>('/admin/users'),
  adminUpdateUser: (id: number, role: Role, active: boolean) => send<User>('PUT', `/admin/users/${id}`, { role, active }),
  adminOrders: () => request<Order[]>('/admin/orders'),
  createCategory: (name: string) => send<Category>('POST', '/admin/categories', { name }),
  updateCategory: (id: number, name: string) => send<Category>('PUT', `/admin/categories/${id}`, { name }),
  deleteCategory: (id: number) => send<void>('DELETE', `/admin/categories/${id}`),
};
