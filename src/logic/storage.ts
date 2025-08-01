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

export const addToHistory = (content: string, type: 'text' | 'image' = 'text', source?: string) => {
  // Ensure we have a valid history object
  const history = ensureValidHistory(clipboardHistory.value)

  const newItem: ClipboardItem = {
    id: crypto.randomUUID(),
    content,
    timestamp: Date.now(),
    type,
    source
  }

  history.items = [newItem, ...history.items].slice(0, history.maxItems)
  clipboardHistory.value = history
}

export const loadHistory = (): ClipboardHistory => {
  // Force a fresh read from storage and ensure it's valid
  const history = ensureValidHistory(clipboardHistory.value)

  // Re-assign to trigger reactivity
  clipboardHistory.value = { ...history }

  return history
}

export const removeFromHistory = (id: string) => {
  // Ensure we have a valid history object
  const history = ensureValidHistory(clipboardHistory.value)

  history.items = history.items.filter(item => item.id !== id)
  clipboardHistory.value = history
}

export const clearHistory = () => {
  clipboardHistory.value = { ...DEFAULT_HISTORY }
}
