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
    lastChecked: 0
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
      lastChecked: 0
    }
  })

  describe('checkClipboardPermission', () => {
    it('should return true when permission is granted', async () => {
      mockStorage.value.clipboard = 'granted'
      
      const result = await permissionManager.checkClipboardPermission()
      
      expect(result).toBe(true)
    })

    it('should return false when permission is denied', async () => {
      mockStorage.value.clipboard = 'denied'
      
      const result = await permissionManager.checkClipboardPermission()
      
      expect(result).toBe(false)
    })

    it('should return false when permission is prompt and not recently checked', async () => {
      mockStorage.value.clipboard = 'prompt'
      mockStorage.value.lastChecked = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      
      const result = await permissionManager.checkClipboardPermission()
      
      expect(result).toBe(false)
    })
  })

  describe('requestClipboardPermission', () => {
    it('should return true when permission is already granted', async () => {
      mockStorage.value.clipboard = 'granted'
      
      const result = await permissionManager.requestClipboardPermission()
      
      expect(result).toBe(true)
    })

    it('should update stored permission status after request', async () => {
      mockStorage.value.clipboard = 'prompt'
      
      // Mock successful permission request
      Object.assign(global, { navigator: mockNavigator })
      mockNavigator.clipboard.readText.mockResolvedValue('test')
      
      const result = await permissionManager.requestClipboardPermission()
      
      expect(result).toBe(true)
      expect(mockStorage.value.clipboard).toBe('granted')
      expect(mockStorage.value.lastChecked).toBeGreaterThan(0)
    })
  })

  describe('shouldShowPermissionRequest', () => {
    it('should return true when permission is prompt', () => {
      mockStorage.value.clipboard = 'prompt'
      
      const result = permissionManager.shouldShowPermissionRequest()
      
      expect(result).toBe(true)
    })

    it('should return true when permission is denied and more than 7 days ago', () => {
      mockStorage.value.clipboard = 'denied'
      mockStorage.value.lastChecked = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago
      
      const result = permissionManager.shouldShowPermissionRequest()
      
      expect(result).toBe(true)
    })

    it('should return false when permission is granted', () => {
      mockStorage.value.clipboard = 'granted'
      
      const result = permissionManager.shouldShowPermissionRequest()
      
      expect(result).toBe(false)
    })
  })

  describe('resetPermissionStatus', () => {
    it('should reset permission status to prompt', () => {
      mockStorage.value.clipboard = 'denied'
      mockStorage.value.lastChecked = Date.now()
      
      permissionManager.resetPermissionStatus()
      
      expect(mockStorage.value.clipboard).toBe('prompt')
      expect(mockStorage.value.lastChecked).toBe(0)
    })
  })
}) 