import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Define the context type
interface NotificationContextType {
  newMatchCount: number;
  incrementMatchCount: () => void;
  resetMatchCount: () => void;
  showMatchPopup: boolean;
  setShowMatchPopup: (show: boolean) => void;
  latestMatchImage: string | null;
  setLatestMatchImage: (image: string | null) => void;
}

// Create the context with default values
const NotificationContext = createContext<NotificationContextType>({
  newMatchCount: 0,
  incrementMatchCount: () => {},
  resetMatchCount: () => {},
  showMatchPopup: false,
  setShowMatchPopup: () => {},
  latestMatchImage: null,
  setLatestMatchImage: () => {},
});

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() || { user: null };
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [latestMatchImage, setLatestMatchImage] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Function to increment match count
  const incrementMatchCount = () => {
    setNewMatchCount(prev => prev + 1);
  };

  // Function to reset match count
  const resetMatchCount = () => {
    setNewMatchCount(0);
  };

  // Make current user available globally for other components
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      (window as any).currentUser = user;
      console.log('NotificationContext: Current user set globally', user.id);
    }
  }, [user]);
  
  // Handle match notifications
  // Track if the component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Setup cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear any global state when the context is unmounted
      if (typeof window !== 'undefined') {
        (window as any).hasNewMatches = false;
        (window as any).globalChatMatches = [];
      }
    };
  }, []);
  
  useEffect(() => {
    // Prevent re-initialization on rerenders with saved state
    if (isInitializedRef.current) {
      return;
    }
    
    isInitializedRef.current = true;
    
    // Reset state on fresh initialization
    if (isMountedRef.current) {
      setNewMatchCount(0);
      setShowMatchPopup(false);
    }
    
    // Direct handler for newMatch custom events
    const handleNewMatch = (event: CustomEvent) => {
      console.log('NotificationContext: Received newMatch event with data:', event.detail);
      
      // Extract match data from the event
      const matchData = event.detail;
      
      if (!matchData) {
        console.error('NotificationContext: Invalid match data in event');
        return;
      }
      
      // Only show notification if current user is the buyer
      if (user && user.id === matchData.buyerId) {
        console.log('NotificationContext: Showing match notification for buyer:', user.id);
        
        // Set the match image and show popup
        setLatestMatchImage(matchData.productImage);
        incrementMatchCount();
        setShowMatchPopup(true);
        
        // Hide popup after 5 seconds
        setTimeout(() => {
          setShowMatchPopup(false);
        }, 5000);
      } else {
        console.log('NotificationContext: User is not the buyer, skipping notification');
      }
    };
    
    // Also check for global match data (fallback method)
    const checkGlobalMatches = () => {
      if (typeof window !== 'undefined' && 
          (window as any).hasNewMatches && 
          (window as any).globalChatMatches && 
          (window as any).globalChatMatches.length > 0) {
        
        const matchData = (window as any).globalChatMatches[0];
        console.log('NotificationContext: Found global match data:', matchData);
        
        // Only show notification if current user is the buyer
        if (user && user.id === matchData.buyerId) {
          console.log('NotificationContext: Showing match notification from global data');
          
          // Set the match image and show popup
          setLatestMatchImage(matchData.productImage);
          incrementMatchCount();
          setShowMatchPopup(true);
          
          // Hide popup after 5 seconds
          setTimeout(() => {
            setShowMatchPopup(false);
          }, 5000);
          
          // Reset the global flag
          (window as any).hasNewMatches = false;
        }
      }
    };
    
    // Add event listener for custom newMatch event
    if (typeof window !== 'undefined') {
      window.addEventListener('newMatch', handleNewMatch as EventListener);
      
      // Initial check for any pending matches
      checkGlobalMatches();
      
      // Set up an interval as a fallback method - only if not already set up
      if (!intervalRef.current) {
        intervalRef.current = setInterval(checkGlobalMatches, 2000);
      }
      
      // Listen for browser navigation events (back/forward buttons)
      const handleNavigation = () => {
        if (isMountedRef.current) {
          console.log('NotificationContext: Detected navigation event, cleaning up');
          // Clear interval and reset state
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Reset any global flags that might cause issues
          if (typeof window !== 'undefined') {
            (window as any).hasNewMatches = false;
          }
        }
      };
      
      // Add listeners for browser navigation
      if (typeof window !== 'undefined') {
        window.addEventListener('popstate', handleNavigation);
      }
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (typeof window !== 'undefined') {
          window.removeEventListener('newMatch', handleNewMatch as EventListener);
          window.removeEventListener('popstate', handleNavigation);
        }
        // Don't reset isInitializedRef on cleanup for certain cases
        // but do reset it on browser navigation events
      };
    }
  }, [user]);

  // Reset the initialization flag when the user changes
  // This ensures we properly handle user changes and login/logout
  useEffect(() => {
    // Only reset if we have a user change (login/logout)
    if (user) {
      console.log('NotificationContext: User changed, ensuring fresh state');
      // Reset any stored matches when user changes
      if (typeof window !== 'undefined') {
        (window as any).hasNewMatches = false;
        (window as any).globalChatMatches = [];
      }
    }
  }, [user?.id]);
  
  return (
    <NotificationContext.Provider
      value={{
        newMatchCount,
        incrementMatchCount,
        resetMatchCount,
        showMatchPopup,
        setShowMatchPopup,
        latestMatchImage,
        setLatestMatchImage,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotification = () => useContext(NotificationContext);
