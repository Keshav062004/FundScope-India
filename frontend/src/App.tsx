import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { LoadingState } from './components/DataState';
import Layout from './components/Layout';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Overview = lazy(() => import('./pages/Overview'));
const ExploreFunds = lazy(() => import('./pages/ExploreFunds'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Calculators = lazy(() => import('./pages/Calculators'));

function PageLoading() {
  return (
    <div className="mx-auto mt-8 max-w-2xl p-6">
      <LoadingState label="Loading workspace" />
    </div>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<ProtectedLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="explore" element={<ExploreFunds />} />
              <Route path="calculators" element={<Calculators />} />
              <Route path="portfolio" element={<Portfolio />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
