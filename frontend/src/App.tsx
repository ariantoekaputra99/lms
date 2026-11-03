import { Link, Route, Routes } from 'react-router-dom';
import { Layout, Page } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { HomePage } from './pages/public/HomePage';
import { CatalogPage } from './pages/public/CatalogPage';
import { CourseDetailPage } from './pages/public/CourseDetailPage';
import { LoginPage, RegisterPage } from './pages/public/AuthPages';
import { CertificatePage, VerifyPage } from './pages/public/CertificatePages';
import { CheckoutFinishPage, SimulatePaymentPage } from './pages/public/CheckoutPages';
import { LearnPage } from './pages/student/LearnPage';
import { AccountPage, MyCertificatesPage, MyCoursesPage, MyOrdersPage } from './pages/student/MyPages';
import { InstructorDashboard, SubmissionsPage } from './pages/instructor/InstructorPages';
import { CourseEditorPage } from './pages/instructor/CourseEditorPage';
import { AdminCategoriesPage, AdminDashboard, AdminOrdersPage, AdminUsersPage } from './pages/admin/AdminPages';

const INSTRUCTOR = ['INSTRUCTOR', 'ADMIN'] as const;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CatalogPage />} />
        <Route path="courses/:slug" element={<CourseDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify" element={<VerifyPage />} />
        <Route path="certificates/:code" element={<CertificatePage />} />

        <Route path="checkout/simulate/:code" element={<RequireAuth><SimulatePaymentPage /></RequireAuth>} />
        <Route path="checkout/finish" element={<RequireAuth><CheckoutFinishPage /></RequireAuth>} />
        <Route path="learn/:courseId/:lessonId?" element={<RequireAuth><LearnPage /></RequireAuth>} />
        <Route path="my/courses" element={<RequireAuth><MyCoursesPage /></RequireAuth>} />
        <Route path="my/certificates" element={<RequireAuth><MyCertificatesPage /></RequireAuth>} />
        <Route path="my/orders" element={<RequireAuth><MyOrdersPage /></RequireAuth>} />
        <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />

        <Route path="instructor" element={<RequireAuth roles={[...INSTRUCTOR]}><InstructorDashboard /></RequireAuth>} />
        <Route path="instructor/submissions" element={<RequireAuth roles={[...INSTRUCTOR]}><SubmissionsPage /></RequireAuth>} />
        <Route path="instructor/courses/:id" element={<RequireAuth roles={[...INSTRUCTOR]}><CourseEditorPage /></RequireAuth>} />

        <Route path="admin" element={<RequireAuth roles={['ADMIN']}><AdminDashboard /></RequireAuth>} />
        <Route path="admin/users" element={<RequireAuth roles={['ADMIN']}><AdminUsersPage /></RequireAuth>} />
        <Route path="admin/orders" element={<RequireAuth roles={['ADMIN']}><AdminOrdersPage /></RequireAuth>} />
        <Route path="admin/categories" element={<RequireAuth roles={['ADMIN']}><AdminCategoriesPage /></RequireAuth>} />

        <Route path="*" element={
          <Page><div className="py-20 text-center"><p className="text-6xl font-bold text-slate-200">404</p>
            <p className="mt-3 font-semibold text-slate-900">Halaman tidak ditemukan</p>
            <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand-600">Kembali ke beranda</Link></div></Page>
        } />
      </Route>
    </Routes>
  );
}
