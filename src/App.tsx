import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { routes } from './routes';

const NotFound = lazy(() => import('./pages/NotFound'));

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <RouteGuard>
            <IntersectObserver />
            <ErrorBoundary>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-8"><PageSkeleton /></div>}>
                <Routes>
                  {routes.map((route) => {
                    const Component = route.component;
                    return (
                      <Route
                        key={route.path}
                        path={route.path}
                        element={
                          <ErrorBoundary>
                            <Component />
                          </ErrorBoundary>
                        }
                      />
                    );
                  })}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            <Toaster richColors closeButton position="top-right" />
          </RouteGuard>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
