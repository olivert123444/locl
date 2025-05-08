import React, { createContext, useState, useContext, useEffect } from 'react';

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
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [latestMatchImage, setLatestMatchImage] = useState<string | null>(null);
  
  // Force a notification for testing
  useEffect(() => {
    // Set initial notification count to 1 for testing
    if (newMatchCount === 0) {
      setNewMatchCount(1);
    }
  }, []);

  // Function to increment match count
  const incrementMatchCount = () => {
    setNewMatchCount(prev => prev + 1);
  };

  // Function to reset match count
  const resetMatchCount = () => {
    setNewMatchCount(0);
  };

  // Check global state for new matches
  useEffect(() => {
    const checkForNewMatches = () => {
      if (typeof window !== 'undefined' && (window as any).hasNewMatches) {
        // Get the latest match
        if ((window as any).globalChatMatches && (window as any).globalChatMatches.length > 0) {
          const latestMatch = (window as any).globalChatMatches[0];
          setLatestMatchImage(latestMatch.productImage);
          incrementMatchCount();
          setShowMatchPopup(true);
          
          // Hide popup after 3 seconds
          setTimeout(() => {
            setShowMatchPopup(false);
          }, 3000);
          
          // Reset the new matches flag
          (window as any).hasNewMatches = false;
        }
      }
    };
    
    // Set up an interval to check for new matches
    const interval = setInterval(checkForNewMatches, 1000);
    
    return () => clearInterval(interval);
  }, []);

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
