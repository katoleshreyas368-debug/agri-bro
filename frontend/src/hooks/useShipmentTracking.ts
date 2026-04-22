import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * useShipmentTracking — React hook for real-time shipment updates via WebSocket.
 *
 * Drop-in replacement for the old setInterval(fetchRequests, 2000) polling pattern.
 * When a shipment changes on the server, the update arrives instantly via Socket.io.
 *
 * Usage:
 *   const { liveUpdates, connected } = useShipmentTracking(shipmentIds);
 *
 * - `shipmentIds`  : array of shipment IDs to watch (pass `requests.map(r => r.id)`)
 * - `liveUpdates`  : Map<id, partial update data>  — merge with your local state
 * - `connected`    : boolean — whether the WebSocket connection is alive
 */

const BACKEND_URL = 'http://localhost:3000';

interface ShipmentUpdate {
  id: string;
  status?: string;
  progress?: number;
  transporterId?: string;
  transporterName?: string;
  [key: string]: unknown;
}

export function useShipmentTracking(shipmentIds: string[]) {
  const [liveUpdates, setLiveUpdates] = useState<Map<string, ShipmentUpdate>>(new Map());
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const watchedIdsRef = useRef<Set<string>>(new Set());

  // Handler for incoming updates
  const handleUpdate = useCallback((data: ShipmentUpdate) => {
    if (!data?.id) return;
    setLiveUpdates(prev => {
      const next = new Map(prev);
      const existing = next.get(data.id) || {};
      next.set(data.id, { ...existing, ...data });
      return next;
    });
  }, []);

  useEffect(() => {
    // Create socket connection (only once)
    if (!socketRef.current) {
      const socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
      });

      socket.on('connect', () => {
        console.log('🔌 WebSocket connected:', socket.id);
        setConnected(true);
        // Re-join all rooms on reconnect
        watchedIdsRef.current.forEach(id => {
          socket.emit('watch_shipment', id);
        });
      });

      socket.on('disconnect', () => {
        console.log('🔌 WebSocket disconnected');
        setConnected(false);
      });

      socket.on('shipment_update', handleUpdate);
      socket.on('progress_update', handleUpdate);

      socketRef.current = socket;
    }

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        watchedIdsRef.current.clear();
      }
    };
  }, [handleUpdate]);

  // Watch / unwatch shipment IDs as the list changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const currentIds = new Set(shipmentIds);
    const prevIds = watchedIdsRef.current;

    // Join new rooms
    currentIds.forEach(id => {
      if (!prevIds.has(id)) {
        socket.emit('watch_shipment', id);
      }
    });

    // Leave removed rooms
    prevIds.forEach(id => {
      if (!currentIds.has(id)) {
        socket.emit('unwatch_shipment', id);
      }
    });

    watchedIdsRef.current = currentIds;
  }, [shipmentIds]);

  return { liveUpdates, connected };
}
