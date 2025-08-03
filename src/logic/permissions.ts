import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'

export interface PermissionStatus {
  clipboard: 'granted' | 'denied' | 'prompt'
  lastChecked: number
}

const DEFAULT_PERMISSION_STATUS: PermissionStatus = {
  clipboard: 'prompt',
  lastChecked: 0
}

// Persistent storage for permission status
export const permissionStatus = useWebExtensionStorage<PermissionStatus>(
  'permissionStatus',
  DEFAULT_PERMISSION_STATUS,
  { mergeDefaults: true }
)

export class PermissionManager {
  private static instance: PermissionManager
  private permissionCache: Map<string, PermissionStatus> = new Map()

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager()
    }
    return PermissionManager.instance
  }

  /**
   * Check if clipboard permission is granted
   */
  async checkClipboardPermission(): Promise<boolean> {
    try {
      // First check our stored permission status
      const storedStatus = permissionStatus.value
      
      if (storedStatus.clipboard === 'granted') {
        return true
      }
      
      if (storedStatus.clipboard === 'denied') {
        return false
      }

      // If we haven't asked before or it's been a while, check with the browser
      const now = Date.now()
      const timeSinceLastCheck = now - storedStatus.lastChecked
      
      // Only check browser permission if it's been more than 24 hours since last check
      if (timeSinceLastCheck > 24 * 60 * 60 * 1000) {
        const browserPermission = await this.queryClipboardPermission()
        
        // Update stored status
        permissionStatus.value = {
          clipboard: browserPermission ? 'granted' : 'denied',
          lastChecked: now
        }
        
        return browserPermission
      }
      
      return false
    } catch (error) {
      console.error('Error checking clipboard permission:', error)
      return false
    }
  }

  /**
   * Request clipboard permission from user
   */
  async requestClipboardPermission(): Promise<boolean> {
    try {
      // Check if we already have permission
      const hasPermission = await this.checkClipboardPermission()
      if (hasPermission) {
        return true
      }

      // Request permission from the browser
      const granted = await this.queryClipboardPermission()
      
      // Update stored status
      permissionStatus.value = {
        clipboard: granted ? 'granted' : 'denied',
        lastChecked: Date.now()
      }
      
      return granted
    } catch (error) {
      console.error('Error requesting clipboard permission:', error)
      return false
    }
  }

  /**
   * Query the browser for clipboard permission
   */
  private async queryClipboardPermission(): Promise<boolean> {
    try {
      // Try to read from clipboard to test permission
      // This will trigger the permission prompt if not already granted
      await navigator.clipboard.readText()
      return true
    } catch (error) {
      // If we get a permission error, the user denied or hasn't granted permission
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return false
      }
      // For other errors (like clipboard being empty), we assume permission is granted
      return true
    }
  }

  /**
   * Reset permission status (useful for testing or if user wants to change permission)
   */
  resetPermissionStatus(): void {
    permissionStatus.value = {
      clipboard: 'prompt',
      lastChecked: 0
    }
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): PermissionStatus {
    return { ...permissionStatus.value }
  }

  /**
   * Check if permission has been permanently denied
   */
  isPermanentlyDenied(): boolean {
    return permissionStatus.value.clipboard === 'denied'
  }

  /**
   * Check if we should show permission request UI
   */
  shouldShowPermissionRequest(): boolean {
    const status = permissionStatus.value
    return status.clipboard === 'prompt' || 
           (status.clipboard === 'denied' && 
            Date.now() - status.lastChecked > 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance() 