import { describe, it, expect, vi, beforeEach } from 'vitest'
import { permissionManager, permissionStatus } from './permissions'

// Mock the browser API
const mockNavigator = {
  clipboard: {
    readText: vi.fn()
  }
}

// Mock the storage
const mockStorage = {
  value: {
    clipboard: 'prompt' as const,
    lastChecked: 0,
    hasRequested: false
  }
}

vi.mock('~/composables/useWebExtensionStorage', () => ({
  useWebExtensionStorage: () => mockStorage
}))

describe('PermissionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock storage
    mockStorage.value = {
      clipboard: 'prompt',
      lastChecked: 0,
      hasRequested: false
    }
  })

  describe('checkClipboardPermission', () => {
    it('should return true when permission is granted', async () => {
      mockStorage.value.clipboard = 'granted'
      mockStorage.value.hasRequested = true
      
      const result = await permissionManager.checkClipboardPermission()
      
      expect(result).toBe(true)
    })

    it('should return false when permission is denied and already requested', async () => {
      mockStorage.value.clipboard = 'denied'
      mockStorage.value.hasRequested = true
      
      const result = await permissionManager.checkClipboardPermission()
      
      expect(result).toBe(false)
    })

    it('should check browser permission when not requested before', async () => {
      mockStorage.value.clipboard = 'prompt'
      mockStorage.value.hasRequested = false
      
      // Mock successful permission request
      Object.assign(global, { navigator: mockNavigator })
      mockNavigator.clipboard.readText.mockResolvedValue('test')
      
      const result = await permissionManager.checkClipboardPermission()
      
      expect(result).toBe(true)
      expect(mockStorage.value.clipboard).toBe('granted')
      expect(mockStorage.value.hasRequested).toBe(true)
    })
  })

  describe('requestClipboardPermission', () => {
    it('should return true when permission is already granted', async () => {
      mockStorage.value.clipboard = 'granted'
      mockStorage.value.hasRequested = true
      
      const result = await permissionManager.requestClipboardPermission()
      
      expect(result).toBe(true)
    })

    it('should update stored permission status after request', async () => {
      mockStorage.value.clipboard = 'prompt'
      mockStorage.value.hasRequested = false
      
      // Mock successful permission request
      Object.assign(global, { navigator: mockNavigator })
      mockNavigator.clipboard.readText.mockResolvedValue('test')
      
      const result = await permissionManager.requestClipboardPermission()
      
      expect(result).toBe(true)
      expect(mockStorage.value.clipboard).toBe('granted')
      expect(mockStorage.value.hasRequested).toBe(true)
      expect(mockStorage.value.lastChecked).toBeGreaterThan(0)
    })
  })

  describe('shouldShowPermissionRequest', () => {
    it('should return true when not requested before', () => {
      mockStorage.value.hasRequested = false
      
      const result = permissionManager.shouldShowPermissionRequest()
      
      expect(result).toBe(true)
    })

    it('should return true when permission is denied and more than 30 days ago', () => {
      mockStorage.value.clipboard = 'denied'
      mockStorage.value.hasRequested = true
      mockStorage.value.lastChecked = Date.now() - 31 * 24 * 60 * 60 * 1000 // 31 days ago
      
      const result = permissionManager.shouldShowPermissionRequest()
      
      expect(result).toBe(true)
    })

    it('should return false when permission is denied but less than 30 days ago', () => {
      mockStorage.value.clipboard = 'denied'
      mockStorage.value.hasRequested = true
      mockStorage.value.lastChecked = Date.now() - 15 * 24 * 60 * 60 * 1000 // 15 days ago
      
      const result = permissionManager.shouldShowPermissionRequest()
      
      expect(result).toBe(false)
    })

    it('should return false when permission is granted', () => {
      mockStorage.value.clipboard = 'granted'
      mockStorage.value.hasRequested = true
      
      const result = permissionManager.shouldShowPermissionRequest()
      
      expect(result).toBe(false)
    })
  })

  describe('isPermissionGranted', () => {
    it('should return true when permission is granted', () => {
      mockStorage.value.clipboard = 'granted'
      
      const result = permissionManager.isPermissionGranted()
      
      expect(result).toBe(true)
    })

    it('should return false when permission is denied', () => {
      mockStorage.value.clipboard = 'denied'
      
      const result = permissionManager.isPermissionGranted()
      
      expect(result).toBe(false)
    })
  })

  describe('resetPermissionStatus', () => {
    it('should reset permission status to prompt', () => {
      mockStorage.value.clipboard = 'denied'
      mockStorage.value.lastChecked = Date.now()
      mockStorage.value.hasRequested = true
      
      permissionManager.resetPermissionStatus()
      
      expect(mockStorage.value.clipboard).toBe('prompt')
      expect(mockStorage.value.lastChecked).toBe(0)
      expect(mockStorage.value.hasRequested).toBe(false)
    })
  })

  describe('isPermanentlyDenied', () => {
    it('should return true when permission is denied and requested', () => {
      mockStorage.value.clipboard = 'denied'
      mockStorage.value.hasRequested = true
      
      const result = permissionManager.isPermanentlyDenied()
      
      expect(result).toBe(true)
    })

    it('should return false when permission is denied but not requested', () => {
      mockStorage.value.clipboard = 'denied'
      mockStorage.value.hasRequested = false
      
      const result = permissionManager.isPermanentlyDenied()
      
      expect(result).toBe(false)
    })
  })
}) 