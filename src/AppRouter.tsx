import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { App } from './App';
import { LoginView } from '../components/views/LoginView';
import { SignupView } from '../components/views/SignupView';
import { routeForView } from './data/routes';

export default function AppRouter() {
  const { isAuthenticated, initialized } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const pathname = window.location.pathname;

    if (!isAuthenticated) {
      if (pathname !== '/login' && pathname !== '/signup') {
        window.history.replaceState(
          { view: 'login' },
          '',
          '/login',
        );
        setCurrentPath('/login');
      }
      return;
    }

    /*
     * Authentication has completed.
     * The workspace itself owns route resolution, so AppRouter only
     * needs to move an authenticated user away from the login screen.
     */
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
      const dashboardPath = routeForView('dashboard');

      if (window.location.pathname !== dashboardPath) {
        window.history.replaceState(
          { view: 'dashboard' },
          '',
          dashboardPath + window.location.search,
        );
        setCurrentPath(dashboardPath);
      }
    }
  }, [initialized, isAuthenticated]);

  if (!initialized) {
    return (
      <div className="at-boot-screen">
        <div className="at-boot-mark">A</div>

        <div className="at-boot-title">
          ANTITODE
        </div>

        <div className="at-boot-status">
          Initializing secure session
        </div>

        <div className="at-boot-bar">
          <span />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (currentPath === '/signup') {
      return (
        <SignupView
          onNavigateToLogin={() => {
            window.history.pushState({ view: 'login' }, '', '/login');
            setCurrentPath('/login');
          }}
        />
      );
    }

    return (
      <LoginView
        onNavigateToSignup={() => {
          window.history.pushState({ view: 'signup' }, '', '/signup');
          setCurrentPath('/signup');
        }}
      />
    );
  }

  return <App />;
}