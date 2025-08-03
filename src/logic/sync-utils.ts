import type { SyncOperation, SyncStatus } from './sync'

export interface SyncRetryConfig {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
}

export interface ConflictResolution {
  resolved: boolean
  operation?: SyncOperation
  error?: string
}

export class SyncConflictResolver {
  private static readonly DEFAULT_RETRY_CONFIG: SyncRetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  }

  /**
   * Resolve conflicts between operations
   */
  static resolveConflicts(operations: SyncOperation[]): ConflictResolution[] {
    const results: ConflictResolution[] = []
    const processedIds = new Set<string>()

    // Sort operations by timestamp (oldest first)
    const sortedOperations = [...operations].sort((a, b) => a.timestamp - b.timestamp)

    for (const operation of sortedOperations) {
      if (operation.itemId && processedIds.has(operation.itemId)) {
        // Conflict detected - skip this operation
        results.push({
          resolved: false,
          error: `Conflict detected for item ${operation.itemId}`
        })
        continue
      }

      if (operation.itemId) {
        processedIds.add(operation.itemId)
      }

      results.push({
        resolved: true,
        operation
      })
    }

    return results
  }

  /**
   * Retry a sync operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    config: Partial<SyncRetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config }
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt === finalConfig.maxRetries) {
          throw lastError
        }

        // Wait before retrying with exponential backoff
        const delay = finalConfig.retryDelay * Math.pow(finalConfig.backoffMultiplier, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  /**
   * Validate sync operation
   */
  static validateOperation(operation: SyncOperation): { valid: boolean; error?: string } {
    if (!operation.type || !['create', 'delete', 'clear', 'update'].includes(operation.type)) {
      return { valid: false, error: 'Invalid operation type' }
    }

    if (!operation.timestamp || typeof operation.timestamp !== 'number') {
      return { valid: false, error: 'Invalid timestamp' }
    }

    if (!operation.source || !['popup', 'sidepanel', 'content', 'background'].includes(operation.source)) {
      return { valid: false, error: 'Invalid source' }
    }

    // Validate operation-specific requirements
    switch (operation.type) {
      case 'create':
        if (!operation.data) {
          return { valid: false, error: 'Create operation requires data' }
        }
        if (!operation.data.id || !operation.data.content) {
          return { valid: false, error: 'Create operation data is incomplete' }
        }
        break

      case 'delete':
        if (!operation.itemId) {
          return { valid: false, error: 'Delete operation requires itemId' }
        }
        break

      case 'update':
        if (!operation.data || !operation.itemId) {
          return { valid: false, error: 'Update operation requires both data and itemId' }
        }
        break

      case 'clear':
        // No additional validation needed
        break
    }

    return { valid: true }
  }

  /**
   * Merge sync statuses from different contexts
   */
  static mergeSyncStatuses(statuses: SyncStatus[]): SyncStatus {
    if (statuses.length === 0) {
      return {
        isSyncing: false,
        lastSyncTime: Date.now(),
        pendingOperations: []
      }
    }

    const merged: SyncStatus = {
      isSyncing: statuses.some(s => s.isSyncing),
      lastSyncTime: Math.max(...statuses.map(s => s.lastSyncTime)),
      pendingOperations: [],
      error: undefined
    }

    // Merge pending operations, removing duplicates
    const operationMap = new Map<string, SyncOperation>()
    for (const status of statuses) {
      for (const operation of status.pendingOperations) {
        const key = `${operation.type}-${operation.itemId || 'clear'}`
        if (!operationMap.has(key) || operation.timestamp > operationMap.get(key)!.timestamp) {
          operationMap.set(key, operation)
        }
      }
    }

    merged.pendingOperations = Array.from(operationMap.values())

    // Set error if any status has an error
    const errors = statuses.filter(s => s.error).map(s => s.error!)
    if (errors.length > 0) {
      merged.error = errors.join('; ')
    }

    return merged
  }

  /**
   * Check if sync status indicates healthy state
   */
  static isHealthy(status: SyncStatus): boolean {
    return !status.isSyncing && 
           !status.error && 
           status.pendingOperations.length === 0 &&
           Date.now() - status.lastSyncTime < 60000 // Last sync within 1 minute
  }

  /**
   * Get sync health status with details
   */
  static getHealthStatus(status: SyncStatus): {
    healthy: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    if (status.isSyncing) {
      issues.push('Currently syncing')
    }

    if (status.error) {
      issues.push(`Sync error: ${status.error}`)
      recommendations.push('Check network connection and try again')
    }

    if (status.pendingOperations.length > 0) {
      issues.push(`${status.pendingOperations.length} pending operations`)
      recommendations.push('Wait for pending operations to complete')
    }

    const timeSinceLastSync = Date.now() - status.lastSyncTime
    if (timeSinceLastSync > 300000) { // 5 minutes
      issues.push('No recent sync activity')
      recommendations.push('Check if sync is working properly')
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    }
  }
} 