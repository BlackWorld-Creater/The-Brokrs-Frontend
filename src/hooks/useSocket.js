import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import useAuthStore from '../store/authStore'

let socketInstance = null

export const getSocket = () => socketInstance

export const useSocket = () => {
  const { accessToken } = useAuthStore()
  const socketRef = useRef(null)

  useEffect(() => {
    if (!accessToken) return
    if (socketInstance?.connected) {
      socketRef.current = socketInstance
      return
    }
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })
    socketInstance = socket
    socketRef.current = socket

    socket.on('connect', () => console.log('💬 Chat connected'))
    socket.on('disconnect', (r) => console.log('💬 Chat disconnected:', r))
    socket.on('connect_error', (e) => console.warn('💬 Chat error:', e.message))

    return () => {
      // Don't disconnect on component unmount — keep persistent
    }
  }, [accessToken])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }, [])

  return { socket: socketRef.current, emit, on }
}
