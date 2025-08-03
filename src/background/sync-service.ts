import { syncManager } from '~/logic/sync'
import { clipboardHistory } from '~/logic/storage'

// Persistent sync service that runs in the background
class PersistentSyncService {
  private syncInterval: number | null = null
  private isRunning = false

  start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('Starting persistent sync service')
    
    // Set up periodic sync checks using setInterval (works in service workers)
    this.syncInterval = setInterval(() => {
      this.performSyncCheck()
    }, 5000) // Check every 5 seconds
  }

  stop() {
    if (!this.isRunning) return
    
    this.isRunning = false
    console.log('Stopping persistent sync service')
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  private async performSyncCheck() {
    try {
      // Check if there are any pending operations
      const status = syncManager.getStatus()
      
      if (status.pendingOperations.length > 0) {
        console.log('Processing pending operations:', status.pendingOperations.length)
        
        // Process pending operations
        for (const operation of status.pendingOperations) {
          await this.processPendingOperation(operation)
        }
      }
      
      // Ensure storage is up to date
      await this.ensureStorageSync()
      
    } catch (error) {
      console.error('Error in sync check:', error)
    }
  }

  private async processPendingOperation(operation: any) {
    try {
      // Re-broadcast the operation to ensure all contexts receive it
      await syncManager.broadcastOperation(operation)
    } catch (error) {
      console.error('Failed to process pending operation:', error)
    }
  }

  private async ensureStorageSync() {
    try {
      // Ensure the storage is properly synchronized
      const currentHistory = clipboardHistory.value
      
      // Broadcast current state to all contexts
      const historyData = {
        history: JSON.parse(JSON.stringify(currentHistory))
      }

      // Broadcast to all contexts
      const contexts = ['popup', 'sidepanel', 'content'] as const
      
      for (const context of contexts) {
        try {
          await browser.runtime.sendMessage({
            type: 'clipboard-updated',
            data: historyData
          })
        } catch (error) {
          // Ignore errors for contexts that aren't active
        }
      }
      
    } catch (error) {
      console.error('Error ensuring storage sync:', error)
    }
  }

  // Force an immediate sync
  async forceSync() {
    console.log('Forcing immediate sync')
    await this.performSyncCheck()
  }
}

// Create and export the service instance
export const syncService = new PersistentSyncService()

// Auto-start the service when the background script loads
syncService.start()

// Clean up when the service worker is terminated
// Note: Service workers don't have beforeunload, they just terminate
// The cleanup will happen automatically when the service worker stops 