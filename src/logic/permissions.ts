import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'

export interface PermissionStatus {
  clipboard: 'granted' | 'denied' | 'prompt'
  lastChecked: number
  hasRequested: boolean // Track if we've ever requested permission
}

const DEFAULT_PERMISSION_STATUS: PermissionStatus = {
  clipboard: 'prompt',
  lastChecked: 0,
  hasRequested: false
}

// Persistent storage for permission status
export const permissionStatus = useWebExtensionStorage<PermissionStatus>(
  'permissionStatus',
  DEFAULT_PERMISSION_STATUS,
  { mergeDefaults: true }
)

// Debug: Log permission status changes
permissionStatus.value && console.log('Permission status initialized:', permissionStatus.value)

// Watch for permission status changes 
import { watch } from 'vue'
watch(permissionStatus, (newStatus, oldStatus) => {
  console.log('Permission status changed:', { old: oldStatus, new: newStatus })
}, { deep: true })

export class PermissionManager {
  private static instance: PermissionManager

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
      
      // If we have a stored 'granted' status, trust it
      if (storedStatus.clipboard === 'granted') {
        return true
      }
      
      // If we have a stored 'denied' status and we've already requested, respect it
      if (storedStatus.clipboard === 'denied' && storedStatus.hasRequested) {
        return false
      }

      // If we haven't asked before, check with the browser
      if (!storedStatus.hasRequested) {
        const browserPermission = await this.queryClipboardPermission()
        
        // Update stored status
        permissionStatus.value = {
          clipboard: browserPermission ? 'granted' : 'denied',
          lastChecked: Date.now(),
          hasRequested: true
        }
        
        return browserPermission
      }

      // If we've asked before but it's been a while, do a gentle check
      const now = Date.now()
      const timeSinceLastCheck = now - storedStatus.lastChecked
      
      // Only check browser permission if it's been more than 7 days since last check
      if (timeSinceLastCheck > 7 * 24 * 60 * 60 * 1000) {
        const browserPermission = await this.queryClipboardPermission()
        
        // Update stored status
        permissionStatus.value = {
          clipboard: browserPermission ? 'granted' : 'denied',
          lastChecked: now,
          hasRequested: true
        }
        
        return browserPermission
      }
      
      // If we've asked before but haven't been granted, return false
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
        lastChecked: Date.now(),
        hasRequested: true
      }
      
      return granted
    } catch (error) {
      console.error('Error requesting clipboard permission:', error)
      return false
    }
  }

  /**
   * Query the browser for clipboard permission using Chrome permissions API
   */
  private async queryClipboardPermission(): Promise<boolean> {
    try {
      // Check if we have the clipboardRead permission
      if (typeof browser !== 'undefined' && browser.permissions) {
        const hasPermission = await browser.permissions.contains({ permissions: ['clipboardRead'] })
        if (hasPermission) {
          // Try to read from clipboard to test actual access
          await navigator.clipboard.readText()
          return true
        } else {
          // Request the permission
          const granted = await browser.permissions.request({ permissions: ['clipboardRead'] })
          if (granted) {
            // Try to read from clipboard after permission is granted
            await navigator.clipboard.readText()
            return true
          }
          return false
        }
      } else {
        // Fallback to direct clipboard access (for testing or non-Chrome browsers)
        await navigator.clipboard.readText()
        return true
      }
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
      lastChecked: 0,
      hasRequested: false
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
    return permissionStatus.value.clipboard === 'denied' && permissionStatus.value.hasRequested
  }

  /**
   * Check if we should show permission request UI
   * Only show if:
   * 1. We haven't asked before (hasRequested = false)
   * 2. OR we asked before but got denied and it's been more than 30 days
   * 3. Never show if permission is already granted
   */
  shouldShowPermissionRequest(): boolean {
    const status = permissionStatus.value
    
    console.log('shouldShowPermissionRequest - status:', status)
    
    // If permission is granted, never show the request
    if (status.clipboard === 'granted') {
      console.log('Permission granted, not showing request')
      return false
    }
    
    // If we haven't asked before, show the request
    if (!status.hasRequested) {
      console.log('Never asked before, showing request')
      return true
    }
    
    // If we asked before and got denied, only show again after 30 days
    if (status.clipboard === 'denied') {
      const now = Date.now()
      const timeSinceLastCheck = now - status.lastChecked
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      
      console.log('Permission denied, time since last check:', timeSinceLastCheck, 'ms')
      return timeSinceLastCheck > thirtyDays
    }
    
    // For any other status (prompt, etc.), don't show if we've already asked
    console.log('Already asked before, not showing request')
    return false
  }

  /**
   * Check if permission is granted by testing the actual browser API
   * This is more reliable than relying on stored state
   */
  async isPermissionActuallyGranted(): Promise<boolean> {
    try {
      // First check if we have the clipboardRead permission
      if (typeof browser !== 'undefined' && browser.permissions) {
        const hasPermission = await browser.permissions.contains({ permissions: ['clipboardRead'] })
        if (!hasPermission) {
          return false
        }
      }
      
      // Try to read from clipboard to test permission
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
   * Check if permission is currently granted (without triggering a request)
   */
  async isPermissionGranted(): Promise<boolean> {
    // First check if we have the clipboardRead permission
    if (typeof browser !== 'undefined' && browser.permissions) {
      try {
        const hasPermission = await browser.permissions.contains({ permissions: ['clipboardRead'] })
        if (hasPermission) {
          // Update stored status to reflect actual permission
          if (permissionStatus.value.clipboard !== 'granted') {
            permissionStatus.value = {
              ...permissionStatus.value,
              clipboard: 'granted',
              hasRequested: true,
              lastChecked: Date.now()
            }
          }
          return true
        } else {
          // Update stored status to reflect no permission
          if (permissionStatus.value.clipboard === 'granted') {
            permissionStatus.value = {
              ...permissionStatus.value,
              clipboard: 'denied',
              hasRequested: true,
              lastChecked: Date.now()
            }
          }
          return false
        }
      } catch (error) {
        console.error('Error checking clipboard permission:', error)
        return false
      }
    }
    
    // Fallback to stored status
    const status = permissionStatus.value
    return status.clipboard === 'granted'
  }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance() 