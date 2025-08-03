import { onMessage, sendMessage } from 'webext-bridge/background'
import { clipboardHistory, type ClipboardHistory, type ClipboardItem } from './storage'
import { SyncConflictResolver } from './sync-utils'

export interface SyncOperation {
  type: 'create' | 'delete' | 'clear' | 'update'
  itemId?: string
  data?: ClipboardItem
  timestamp: number
  source: 'popup' | 'sidepanel' | 'content' | 'background'
}

export interface SyncStatus {
  isSyncing: boolean
  lastSyncTime: number
  pendingOperations: SyncOperation[]
  error?: string
}

class ClipboardSyncManager {
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: Date.now(),
    pendingOperations: []
  }

  private listeners: Set<(status: SyncStatus) => void> = new Set()

  // Subscribe to sync status changes
  subscribe(callback: (status: SyncStatus) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  // Notify all listeners of status changes
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.syncStatus))
  }

  // Update sync status
  private updateStatus(updates: Partial<SyncStatus>) {
    this.syncStatus = { ...this.syncStatus, ...updates }
    this.notifyListeners()
  }

  // Broadcast operation to all contexts with retry logic
  async broadcastOperation(operation: SyncOperation): Promise<void> {
    // Validate operation first
    const validation = SyncConflictResolver.validateOperation(operation)
    if (!validation.valid) {
      throw new Error(`Invalid sync operation: ${validation.error}`)
    }

    return SyncConflictResolver.retryOperation(async () => {
      try {
        this.updateStatus({ isSyncing: true, error: undefined })
        
        const message = {
          type: 'sync-operation',
          operation,
          timestamp: Date.now()
        }

        // Broadcast to all contexts with better error handling
        const contexts = ['popup', 'sidepanel', 'content'] as const
        const broadcastPromises: Promise<void>[] = []
        
        for (const context of contexts) {
          broadcastPromises.push(
            sendMessage('sync-operation', message, { context }).catch(error => {
              console.warn(`Failed to send sync operation to ${context}:`, error)
            })
          )
        }

        // Also broadcast to all tabs for content scripts
        try {
          const tabs = await browser.tabs.query({})
          for (const tab of tabs) {
            if (tab.id) {
              broadcastPromises.push(
                sendMessage('sync-operation', message, { tabId: tab.id }).catch(() => {
                  // Ignore errors for tabs that don't have content scripts
                })
              )
            }
          }
        } catch (error) {
          console.warn('Failed to broadcast to tabs:', error)
        }

        // Wait for all broadcasts to complete
        await Promise.allSettled(broadcastPromises)

        // Also update storage directly to ensure persistence
        this.handleIncomingOperation(operation)

        this.updateStatus({ 
          isSyncing: false, 
          lastSyncTime: Date.now(),
          error: undefined
        })
      } catch (error) {
        this.updateStatus({ 
          isSyncing: false, 
          error: error instanceof Error ? error.message : 'Unknown sync error' 
        })
        throw error
      }
    })
  }

  // Handle item creation with optimistic updates
  async createItem(item: ClipboardItem, source: SyncOperation['source']): Promise<void> {
    const operation: SyncOperation = {
      type: 'create',
      itemId: item.id,
      data: item,
      timestamp: Date.now(),
      source
    }

    // Add to pending operations for conflict resolution
    this.syncStatus.pendingOperations.push(operation)
    this.notifyListeners()

    await this.broadcastOperation(operation)
    
    // Remove from pending operations after successful broadcast
    this.syncStatus.pendingOperations = this.syncStatus.pendingOperations.filter(
      op => !(op.type === 'create' && op.itemId === item.id)
    )
    this.notifyListeners()
  }

  // Handle item deletion with optimistic updates
  async deleteItem(itemId: string, source: SyncOperation['source']): Promise<void> {
    const operation: SyncOperation = {
      type: 'delete',
      itemId,
      timestamp: Date.now(),
      source
    }

    // Add to pending operations for conflict resolution
    this.syncStatus.pendingOperations.push(operation)
    this.notifyListeners()

    await this.broadcastOperation(operation)
    
    // Remove from pending operations after successful broadcast
    this.syncStatus.pendingOperations = this.syncStatus.pendingOperations.filter(
      op => !(op.type === 'delete' && op.itemId === itemId)
    )
    this.notifyListeners()
  }

  // Handle history clear
  async clearHistory(source: SyncOperation['source']): Promise<void> {
    const operation: SyncOperation = {
      type: 'clear',
      timestamp: Date.now(),
      source
    }

    this.syncStatus.pendingOperations.push(operation)
    this.notifyListeners()

    await this.broadcastOperation(operation)
    
    // Remove from pending operations after successful broadcast
    this.syncStatus.pendingOperations = this.syncStatus.pendingOperations.filter(
      op => !(op.type === 'clear')
    )
    this.notifyListeners()
  }

  // Get current sync status
  getStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  // Clear pending operations (called after successful sync)
  clearPendingOperations() {
    this.syncStatus.pendingOperations = []
    this.notifyListeners()
  }

  // Handle incoming sync operations with conflict resolution
  handleIncomingOperation(operation: SyncOperation): void {
    // Prevent circular broadcasts
    if (operation.source === 'background') {
      return
    }

    // Validate incoming operation
    const validation = SyncConflictResolver.validateOperation(operation)
    if (!validation.valid) {
      console.error('Received invalid sync operation:', validation.error)
      return
    }

    // Process the operation based on type
    switch (operation.type) {
      case 'create':
        if (operation.data) {
          // Add item to history if it doesn't exist
          const existingItem = clipboardHistory.value.items.find(item => item.id === operation.data!.id)
          if (!existingItem) {
            clipboardHistory.value.items = [operation.data, ...clipboardHistory.value.items]
          }
        }
        break

      case 'delete':
        if (operation.itemId) {
          clipboardHistory.value.items = clipboardHistory.value.items.filter(
            item => item.id !== operation.itemId
          )
        }
        break

      case 'clear':
        clipboardHistory.value.items = []
        break

      case 'update':
        if (operation.data) {
          const index = clipboardHistory.value.items.findIndex(item => item.id === operation.data!.id)
          if (index !== -1) {
            clipboardHistory.value.items[index] = operation.data
          }
        }
        break
    }

    // Update sync status
    this.updateStatus({ lastSyncTime: Date.now() })
  }

  // Get health status
  getHealthStatus() {
    return SyncConflictResolver.getHealthStatus(this.syncStatus)
  }

  // Check if sync is healthy
  isHealthy(): boolean {
    return SyncConflictResolver.isHealthy(this.syncStatus)
  }
}

// Create singleton instance
export const syncManager = new ClipboardSyncManager()

// Set up message listeners for sync operations
export function setupSyncListeners() {
  onMessage('sync-operation', ({ data }) => {
    const { operation } = data as { operation: SyncOperation }
    syncManager.handleIncomingOperation(operation)
  })

  onMessage('get-sync-status', () => {
    return { status: syncManager.getStatus() }
  })

  onMessage('get-sync-health', () => {
    return { health: syncManager.getHealthStatus() }
  })
} 