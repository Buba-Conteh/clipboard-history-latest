import { ref, onMounted, onUnmounted } from 'vue'
import { onMessage, sendMessage } from 'webext-bridge/popup'
import type { SyncStatus } from '~/logic/sync'

export function useSyncStatus() {
  const syncStatus = ref<SyncStatus>({
    isSyncing: false,
    lastSyncTime: Date.now(),
    pendingOperations: []
  })

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Get initial sync status
  const fetchSyncStatus = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await sendMessage('get-sync-status', {}) as { status: SyncStatus }
      if (response && response.status) {
        syncStatus.value = response.status
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch sync status'
      console.error('Failed to fetch sync status:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Listen for sync status updates
  const handleSyncStatusUpdate = (data: any) => {
    if (data && data.status) {
      syncStatus.value = data.status
    }
  }

  // Listen for sync operation messages
  const handleSyncOperation = (data: any) => {
    if (data && data.operation) {
      // Update sync status when operations are received
      syncStatus.value.lastSyncTime = Date.now()
      
      // If this is a new operation, add it to pending
      if (data.operation.timestamp > syncStatus.value.lastSyncTime - 1000) {
        syncStatus.value.pendingOperations.push(data.operation)
      }
    }
  }

  onMounted(() => {
    // Fetch initial status
    fetchSyncStatus()

    // Set up message listeners
    onMessage('sync-status-updated', handleSyncStatusUpdate)
    onMessage('sync-operation', handleSyncOperation)
  })

  onUnmounted(() => {
    // Cleanup is handled automatically by webext-bridge
  })

  // Helper functions
  const getLastSyncTime = () => {
    if (!syncStatus.value.lastSyncTime) return 'Never'
    
    const now = Date.now()
    const diff = now - syncStatus.value.lastSyncTime
    
    if (diff < 1000) return 'Just now'
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    
    return new Date(syncStatus.value.lastSyncTime).toLocaleDateString()
  }

  const getPendingOperationsCount = () => {
    return syncStatus.value.pendingOperations.length
  }

  const hasError = () => {
    return !!syncStatus.value.error
  }

  const getError = () => {
    return syncStatus.value.error
  }

  const isCurrentlySyncing = () => {
    return syncStatus.value.isSyncing
  }

  return {
    syncStatus: syncStatus.value,
    isLoading,
    error,
    fetchSyncStatus,
    getLastSyncTime,
    getPendingOperationsCount,
    hasError,
    getError,
    isCurrentlySyncing
  }
} 