import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'

export interface ClipboardItem {
  id: string
  content: string
  timestamp: number
  type: 'text' | 'image'
  source?: string
}

export interface ClipboardHistory {
  items: ClipboardItem[]
  maxItems: number
}

const DEFAULT_HISTORY: ClipboardHistory = {
  items: [],
  maxItems: 50
}

// Helper function to ensure we have a valid history object
export function ensureValidHistory(value: unknown): ClipboardHistory {
  const history = value as Partial<ClipboardHistory>

  // Ensure items is an array
  if (!Array.isArray(history.items)) {
    history.items = []
  }

  // Ensure maxItems is a number
  if (typeof history.maxItems !== 'number') {
    history.maxItems = DEFAULT_HISTORY.maxItems
  }

  return history as ClipboardHistory
}

// Initialize with a default value
export const clipboardHistory = useWebExtensionStorage<ClipboardHistory>(
  'clipboardHistory',
  DEFAULT_HISTORY,
  { mergeDefaults: true }
)

// Ensure the initial value is valid
clipboardHistory.value = ensureValidHistory(clipboardHistory.value)

export const addToHistory = async (content: string, type: 'text' | 'image' = 'text', source?: string) => {
  console.log('Adding to history:', content, type, source)
  
  // Ensure we have a valid history object
  const history = ensureValidHistory(clipboardHistory.value)

  const newItem: ClipboardItem = {
    id: crypto.randomUUID(),
    content,
    timestamp: Date.now(),
    type,
    source
  }

  console.log('Created new item:', newItem)

  // Add to local state immediately
  history.items = [newItem, ...history.items].slice(0, history.maxItems)
  
  // Update the storage
  clipboardHistory.value = { ...history }
  
  console.log('Updated clipboard history:', clipboardHistory.value)
}

export const loadHistory = (): ClipboardHistory => {
  // Force a fresh read from storage and ensure it's valid
  const history = ensureValidHistory(clipboardHistory.value)

  // Re-assign to trigger reactivity
  clipboardHistory.value = { ...history }

  return history
}

export const removeFromHistory = async (id: string) => {
  // Ensure we have a valid history object
  const history = ensureValidHistory(clipboardHistory.value)

  // Remove from local state immediately
  history.items = history.items.filter(item => item.id !== id)
  clipboardHistory.value = { ...history }
}

export const clearHistory = async () => {
  // Clear local state immediately
  clipboardHistory.value = { ...DEFAULT_HISTORY }
}

// Enhanced function to handle sync operations from other contexts
export const handleSyncOperation = (operation: any) => {
  const history = ensureValidHistory(clipboardHistory.value)
  
  switch (operation.type) {
    case 'create':
      if (operation.data) {
        // Add item if it doesn't exist
        const existingItem = history.items.find(item => item.id === operation.data.id)
        if (!existingItem) {
          history.items = [operation.data, ...history.items].slice(0, history.maxItems)
        }
      }
      break
      
    case 'delete':
      if (operation.itemId) {
        history.items = history.items.filter(item => item.id !== operation.itemId)
      }
      break
      
    case 'clear':
      history.items = []
      break
      
    case 'update':
      if (operation.data) {
        const index = history.items.findIndex(item => item.id === operation.data.id)
        if (index !== -1) {
          history.items[index] = operation.data
        }
      }
      break
  }
  
  clipboardHistory.value = { ...history }
}
