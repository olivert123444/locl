import React, { createContext, useState, useContext, useEffect } from 'react';
import Toast from '@/components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('ToastProvider initialized');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [toastDuration, setToastDuration] = useState(5000);
  
  // Listen for match toast events
  useEffect(() => {
    const handleMatchToast = (event: CustomEvent) => {
      console.log('🔥 Match toast triggered in ToastContext', event.detail);
      
      if (event.detail && event.detail.message) {
        showToast(
          event.detail.message,
          event.detail.type || 'success',
          event.detail.duration || 5000
        );
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('showMatchToast', handleMatchToast as EventListener);
      
      return () => {
        window.removeEventListener('showMatchToast', handleMatchToast as EventListener);
      };
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 5000) => {
    // If a toast is already showing, hide it first
    if (toastVisible) {
      setToastVisible(false);
      setTimeout(() => {
        setToastMessage(message);
        setToastType(type);
        setToastDuration(duration);
        setToastVisible(true);
      }, 300);
    } else {
      setToastMessage(message);
      setToastType(type);
      setToastDuration(duration);
      setToastVisible(true);
    }
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onHide={hideToast}
        type={toastType}
        duration={toastDuration}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
