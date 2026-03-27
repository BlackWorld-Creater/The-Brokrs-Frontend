/**
 * syncStore.js
 *
 * Global reactive context store.
 * Holds the currently selected company, site, and any pending sync notifications.
 * When user updates a company/site/service, all dependent queries are invalidated.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useSyncStore = create(
  persist(
    (set, get) => ({
      activeCompanyId: null,
      activeSiteId: null,
      lastSyncAt: null,
      syncNotifications: [],      // pending sync result messages

      setActiveCompany: (id) => set({ activeCompanyId: id }),
      setActiveSite: (id) => set({ activeSiteId: id }),

      addSyncNotification: (notification) => {
        set(state => ({
          syncNotifications: [notification, ...state.syncNotifications].slice(0, 10),
          lastSyncAt: new Date().toISOString(),
        }))
      },

      clearSyncNotifications: () => set({ syncNotifications: [] }),

      // Called after any entity update — receives syncSummary from API response
      handleSyncResult: (entityType, entityName, syncSummary) => {
        if (!syncSummary) return
        const parts = []
        if (syncSummary.settingsUpdated?.length)  parts.push(`${syncSummary.settingsUpdated.length} setting(s) updated`)
        if (syncSummary.usersNotified > 0)         parts.push(`${syncSummary.usersNotified} user(s) notified`)
        if (syncSummary.usersReassigned > 0)       parts.push(`${syncSummary.usersReassigned} user(s) reassigned`)
        if (syncSummary.adminsNotified > 0)        parts.push(`${syncSummary.adminsNotified} admin(s) notified`)

        if (parts.length > 0) {
          get().addSyncNotification({
            id: Date.now(),
            entityType,
            entityName,
            message: parts.join(' · '),
            at: new Date().toISOString(),
          })
        }
      },
    }),
    {
      name: 'admin-sync',
      partialize: (state) => ({
        activeCompanyId: state.activeCompanyId,
        activeSiteId: state.activeSiteId,
      }),
    }
  )
)

export default useSyncStore
