export type Role = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
export type LessonType = 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export type SubmissionStatus = 'SUBMITTED' | 'GRADED';

export type User = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  headline?: string | null;
  bio?: string | null;
  active: boolean;
  createdAt?: string;
};

export type AuthResponse = { token: string; user: User };

export type Category = { id: number; name: string; slug: string; courseCount: number };

export type CourseSummary = {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  level: CourseLevel;
  price: number;
  free: boolean;
  thumbnailUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  instructorName: string;
  status: CourseStatus;
  lessonCount: number;
  totalMinutes: number;
  studentCount: number;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

export type InstructorInfo = { id: number; fullName: string; headline?: string | null; bio?: string | null };

export type OutlineLesson = { id: number; title: string; type: LessonType; durationMinutes?: number | null; freePreview: boolean };
export type OutlineSection = { id: number; title: string; lessons: OutlineLesson[] };

export type CourseDetail = {
  course: CourseSummary;
  description?: string | null;
  whatYouLearn: string[];
  instructor: InstructorInfo;
  sections: OutlineSection[];
  enrolled: boolean;
  canManage: boolean;
};

export type PlayerLesson = { id: number; title: string; type: LessonType; durationMinutes?: number | null; completed: boolean; locked: boolean };
export type PlayerSection = { id: number; title: string; lessons: PlayerLesson[] };

export type LearningCourse = {
  course: CourseSummary;
  sections: PlayerSection[];
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  completedAt?: string | null;
  certificateCode?: string | null;
  preview: boolean;
};

export type StudentQuestion = { id: number; text: string; options: Array<{ id: number; text: string }> };
export type AttemptSummary = { id: number; score: number; correctCount: number; totalCount: number; passed: boolean; submittedAt: string };

export type Submission = {
  id: number;
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  originalFileName: string;
  note?: string | null;
  status: SubmissionStatus;
  grade?: number | null;
  feedback?: string | null;
  submittedAt: string;
  gradedAt?: string | null;
};

export type LessonContent = {
  id: number;
  title: string;
  type: LessonType;
  durationMinutes?: number | null;
  videoUrl?: string | null;
  content?: string | null;
  hasFile: boolean;
  originalFileName?: string | null;
  passingScore?: number | null;
  assignmentInstructions?: string | null;
  questions: StudentQuestion[];
  completed: boolean;
  attempts: AttemptSummary[];
  submissions: Submission[];
  previousLessonId?: number | null;
  nextLessonId?: number | null;
  preview: boolean;
};

export type QuizResult = {
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  passingScore: number;
  results: Array<{ questionId: number; chosenOptionId?: number | null; correctOptionId?: number | null; correct: boolean; explanation?: string | null }>;
  courseCompleted: boolean;
  certificateCode?: string | null;
};

export type CompletionResponse = { lessonCompleted: boolean; progressPercent: number; courseCompleted: boolean; certificateCode?: string | null };

export type MyCourse = {
  course: CourseSummary;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  enrolledAt: string;
  completedAt?: string | null;
  certificateCode?: string | null;
};

export type Certificate = {
  code: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string;
  courseSlug: string;
};

export type CheckoutResponse = {
  enrolled: boolean;
  orderCode?: string | null;
  status?: OrderStatus | null;
  provider?: string | null;
  redirectUrl?: string | null;
  snapToken?: string | null;
};

export type Order = {
  id: number;
  orderCode: string;
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  studentName: string;
  studentEmail: string;
  amount: number;
  status: OrderStatus;
  provider: string;
  paymentType?: string | null;
  redirectUrl?: string | null;
  createdAt: string;
  paidAt?: string | null;
};

// ---------- instructor editor ----------

export type EditorOption = { id?: number; text: string; correct: boolean };
export type EditorQuestion = { id?: number; text: string; explanation?: string | null; options: EditorOption[] };

export type EditorLesson = {
  id: number;
  title: string;
  type: LessonType;
  position: number;
  durationMinutes?: number | null;
  freePreview: boolean;
  videoUrl?: string | null;
  content?: string | null;
  hasFile: boolean;
  originalFileName?: string | null;
  passingScore?: number | null;
  assignmentInstructions?: string | null;
  questions: EditorQuestion[];
};

export type EditorSection = { id: number; title: string; position: number; lessons: EditorLesson[] };

export type CourseEditor = {
  course: CourseSummary;
  description?: string | null;
  whatYouLearn?: string | null;
  categoryId?: number | null;
  sections: EditorSection[];
  publishProblems: string[];
};

export type CourseRequest = {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  whatYouLearn?: string | null;
  level: CourseLevel;
  price: number;
  categoryId?: number | null;
};

export type LessonRequest = {
  title: string;
  type: LessonType;
  durationMinutes?: number | null;
  freePreview: boolean;
  videoUrl?: string | null;
  content?: string | null;
  passingScore?: number | null;
  assignmentInstructions?: string | null;
};

export type CourseStudent = {
  userId: number;
  fullName: string;
  email: string;
  enrolledAt: string;
  progressPercent: number;
  completedAt?: string | null;
};

export type InstructorStats = { courses: number; publishedCourses: number; students: number; revenue: number; pendingSubmissions: number };

export type AdminStats = {
  users: number;
  students: number;
  instructors: number;
  courses: number;
  publishedCourses: number;
  enrollments: number;
  revenue: number;
  recentOrders: Order[];
};
