"use client";
import { createContext, useContext, useMemo } from 'react';

const IPCContext = createContext(null);

export const useIpc = () => {
  const ipc = useContext(IPCContext);
  if (!ipc) {
    throw new Error('useIpc must be used within an IPCProvider');
  }
  return ipc;
};

export const IPCProvider = ({ children }) => {
  const ipc = useMemo(() => {
    if (window.electronAPI) {
      return {
        ...window.electronAPI,
        toggle: () => {
          if (window.electronAPI?.invoke) {
            window.electronAPI.invoke('mymusicplayer:window:miniPlayer:toggle');
          }
        },
        open: () => {
          if (window.electronAPI?.invoke) {
            window.electronAPI.invoke('mymusicplayer:window:miniPlayer:create');
          }
        },
        close: () => {
          if (window.electronAPI?.invoke) {
            window.electronAPI.invoke('mymusicplayer:window:miniPlayer:close');
          }
        },
        isOpen: async () => {
          if (window.electronAPI?.invoke) {
            const result = await window.electronAPI.invoke('mymusicplayer:window:miniPlayer:isOpen');
            return result?.isOpen || false;
          }
          return false;
        },
      };
    }
    if (window.electronAPI) {
      return {
        ...window.electronAPI,
        invoke: (channel, args) => window.electronAPI.invoke(channel, args),
        send: (channel, args) => window.electronAPI.send(channel, args),
        toggle: () => {},
        open: () => {},
        close: () => {},
        isOpen: () => Promise.resolve(false),
      };
    }
    return {
      invoke: async (channel, args) => {
        throw new Error(`IPC channel ${channel} not available in renderer`);
      },
      send: (channel, args) => {
        console.warn(`IPC channel ${channel} not available in renderer (send)`);
      },
      toggle: () => {},
      open: () => {},
      close: () => {},
      isOpen: () => Promise.resolve(false),
    };
  }, []);

  return <IPCContext.Provider value={ipc}>{children}</IPCContext.Provider>;
};

export const useIPC = useIpc;
export default IPCContext;