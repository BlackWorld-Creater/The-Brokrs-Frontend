import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import useAuthStore from '../store/authStore'

let socketInstance = null

export const getSocket = () => socketInstance

export const useSocket = () => {
  const { accessToken } = useAuthStore()
  const socketRef = useRef(null)

  useEffect(() => {
    // If we have an instance but it's not connected, or if the token changed, we might need a new one
    if (socketInstance && socketInstance.auth?.token !== accessToken) {
      socketInstance.disconnect()
      socketInstance = null
    }

    if (socketInstance?.connected) {
      socketRef.current = socketInstance
      return
    }

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'
    const options = {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    }

    if (accessToken) {
      options.auth = { token: accessToken }
    } else {
      // Connect as guest for support chat
      options.query = { type: 'support_guest' }
    }

    const socket = io(socketUrl, options)
    socketInstance = socket
    socketRef.current = socket

    socket.on('connect', () => console.log(`💬 Chat connected (${accessToken ? 'Member' : 'Guest'})`))
    socket.on('disconnect', (r) => console.log('💬 Chat disconnected:', r))
    socket.on('connect_error', (e) => console.warn('💬 Chat error:', e.message))
    
    // Global support events
    socket.on('support:ticket:assigned', (data) => {
      import('react-hot-toast').then(({ toast }) => {
        toast.success(`🎫 Ticket Assigned: ${data.message || 'A new ticket has been assigned to you!'}`, {
          duration: 6000,
          icon: '🧑‍💻',
          position: 'top-right'
        });
      });
      // Play sound
      new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => {});
    });

    return () => {
      // Don't disconnect on component unmount — keep persistent
    }
  }, [accessToken])

  const emit = useCallback((event, data) => {
    const s = socketRef.current || socketInstance
    s?.emit(event, data)
  }, [])

  const on = useCallback((event, handler) => {
    const s = socketRef.current || socketInstance
    s?.on(event, handler)
    return () => s?.off(event, handler)
  }, [])

  return { socket: socketRef.current || socketInstance, emit, on }
}
