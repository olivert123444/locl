import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Maximum number of logs to keep in memory
const MAX_LOGS = 100;

// Global log queue that components can push to
export const debugLogs: {
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
  data?: any;
}[] = [];

// Function to add logs from anywhere in the app
export const addDebugLog = (
  type: 'info' | 'success' | 'warn' | 'error',
  message: string,
  data?: any
) => {
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  
  debugLogs.unshift({
    timestamp,
    type,
    message,
    data
  });
  
  // Keep log size manageable
  if (debugLogs.length > MAX_LOGS) {
    debugLogs.pop();
  }
};

// Override console methods to capture logs
const setupConsoleOverrides = () => {
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  console.log = (...args) => {
    originalConsoleLog(...args);
    const message = args[0];
    if (typeof message === 'string' && message.includes('[AUTH]')) {
      // Don't duplicate our own logs
      return;
    }
    if (typeof message === 'string' && message.includes('[NAV]')) {
      // Don't duplicate our own logs
      return;
    }
    addDebugLog('info', String(args[0]), args.length > 1 ? args.slice(1) : undefined);
  };
  
  console.info = (...args) => {
    originalConsoleInfo(...args);
    addDebugLog('info', String(args[0]), args.length > 1 ? args.slice(1) : undefined);
  };
  
  console.warn = (...args) => {
    originalConsoleWarn(...args);
    addDebugLog('warn', String(args[0]), args.length > 1 ? args.slice(1) : undefined);
  };
  
  console.error = (...args) => {
    originalConsoleError(...args);
    addDebugLog('error', String(args[0]), args.length > 1 ? args.slice(1) : undefined);
  };
  
  return () => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  };
};

export default function DebugOverlay() {
  const [visible, setVisible] = useState(true); // Always visible by default
  const [logs, setLogs] = useState([...debugLogs]);
  const [expanded, setExpanded] = useState(false);
  
  // Set up console overrides on mount
  useEffect(() => {
    const cleanup = setupConsoleOverrides();
    return cleanup;
  }, []);
  
  // Update logs every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs([...debugLogs]);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!visible) {
    // Just show a small toggle button
    return (
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={() => setVisible(true)}
      >
        <Ionicons name="bug-outline" size={24} color="white" />
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={[
      styles.container, 
      expanded ? styles.expandedContainer : styles.collapsedContainer
    ]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Debug Logs</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              // Clear logs
              debugLogs.length = 0;
              setLogs([]);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setExpanded(!expanded)}
          >
            <Ionicons 
              name={expanded ? "contract-outline" : "expand-outline"} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setVisible(false)}
          >
            <Ionicons name="close-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <View key={index} style={styles.logEntry}>
            <Text style={styles.timestamp}>{log.timestamp}</Text>
            <Text 
              style={[
                styles.logMessage,
                log.type === 'info' && styles.infoText,
                log.type === 'success' && styles.successText,
                log.type === 'warn' && styles.warnText,
                log.type === 'error' && styles.errorText,
              ]}
            >
              {log.message}
            </Text>
            {log.data && (
              <Text style={styles.logData}>
                {typeof log.data === 'object' 
                  ? JSON.stringify(log.data, null, 2)
                  : String(log.data)
                }
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 10,
    zIndex: 9999,
    right: 10,
    maxWidth: width - 20,
  },
  collapsedContainer: {
    top: 50,
    height: height * 0.3,
    width: width * 0.8,
  },
  expandedContainer: {
    top: 50,
    height: height * 0.7,
    width: width * 0.9,
  },
  toggleButton: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 10,
    padding: 5,
  },
  logContainer: {
    flex: 1,
  },
  logEntry: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 5,
  },
  timestamp: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 2,
  },
  logMessage: {
    color: 'white',
    fontSize: 14,
    marginBottom: 2,
  },
  logData: {
    color: '#ddd',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingLeft: 10,
  },
  infoText: {
    color: '#64B5F6',
  },
  successText: {
    color: '#81C784',
  },
  warnText: {
    color: '#FFD54F',
  },
  errorText: {
    color: '#E57373',
  },
});
