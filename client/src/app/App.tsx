import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './ThemeContext.js';
import { AuthProvider, useAuth } from './AuthContext.js';
import { SocketProvider, useSocket } from './SocketContext.js';
import { ToastProvider } from '../components/ui/Toast.js';
import { AuthPage } from '../features/auth/AuthPage.js';
import { ChatPage } from '../features/conversations/ChatPage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';
import { BrandedLoading } from '../components/ui/BrandedLoading.js';

const queryClient = new QueryClient();

function MainContent() {
  const { user, updateUser, isLoading } = useAuth();
  const { socket } = useSocket();

  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Real-time Socket.IO profile update listener
  useEffect(() => {
    if (!socket || !user) return;

    const handleProfileUpdated = (data: { userId: string; displayName?: string; avatar?: string }) => {
      if (data.userId === user.id) {
        updateUser({
          ...user,
          displayName: data.displayName || user.displayName,
          avatar: data.avatar !== undefined ? data.avatar : user.avatar,
        });
      }
    };

    socket.on('user:profile_updated', handleProfileUpdated);
    return () => {
      socket.off('user:profile_updated', handleProfileUpdated);
    };
  }, [socket, user, updateUser]);

  if (isLoading) {
    return <BrandedLoading />;
  }

  if (!user) {
    return <AuthPage />;
  }

  // Full-page Settings navigation (STRICT REQUIREMENT: NEVER A MODAL)
  if (currentPath === '/settings') {
    return <SettingsPage onBack={() => navigate('/')} />;
  }

  return <ChatPage onNavigateToSettings={() => navigate('/settings')} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <MainContent />
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
