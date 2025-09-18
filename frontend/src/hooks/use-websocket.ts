import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for WebSocket connection management
 * 
 * @param url - WebSocket server URL
 * @returns WebSocket instance and connection state
 */
export const useWebSocket = (url: string) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!ws && url) {
      console.log('[WebSocket] Connecting to:', url);
      
      const websocket = new WebSocket(url);
      
      websocket.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setWs(websocket);
        wsRef.current = websocket;
      };

      websocket.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        setWs(null);
        wsRef.current = null;
      };

      websocket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setIsConnected(false);
      };
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url, ws]);

  return { ws, isConnected };
};