import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      permissions: {},
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.login({ email, password });
          const { user, permissions, accessToken, refreshToken } = data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            permissions,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            message: error.response?.data?.message || 'Login failed',
          };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          permissions: {},
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshUser: async () => {
        try {
          const { data } = await authAPI.getMe();
          set({
            user: data.data.user,
            permissions: data.data.permissions,
          });
        } catch {}
      },

      updateUser: (userData) => {
        set((state) => ({ user: { ...state.user, ...userData } }));
      },

      // Permission helpers
      hasPermission: (module, permission) => {
        const { permissions, user } = get();
        if (!user) return false;
        if (user.roles?.includes('super-admin')) return true;
        return permissions[module]?.includes(permission) || false;
      },

      hasRole: (...roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.some(r => user.roles?.includes(r));
      },

      canAccess: (module) => {
        const { permissions, user } = get();
        if (!user) return false;
        if (user.roles?.includes('super-admin')) return true;
        return !!(permissions[module]?.length > 0);
      },
    }),
    {
      name: 'admin-panel-auth',
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
