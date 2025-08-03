<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onMessage, sendMessage } from 'webext-bridge/popup'
import { clipboardHistory, removeFromHistory, loadHistory, clearHistory, type ClipboardHistory, handleSyncOperation } from '~/logic/storage'
import PermissionRequest from './PermissionRequest.vue'
import { donationConfig } from '~/config/donations'

// Helper function to check if extension context is still valid
const isExtensionContextValid = () => {
  try {
    return typeof browser !== 'undefined' && browser.runtime && browser.runtime.id;
  } catch (e) {
    return false;
  }
}

const copiedItemId = ref<string | null>(null)

const currentCoppiedClipboard = async (content: string, id: string) => {
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, cannot copy to clipboard');
      return;
    }
    await navigator.clipboard.writeText(content)
    // Set the copied item ID
    copiedItemId.value = id
  }
  catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

const history = ref(clipboardHistory.value || { items: [], maxItems: 50 })
const search = ref('')

// Watch for changes in clipboardHistory and update local state
watch(() => clipboardHistory.value, (newHistory) => {
  console.log('ClipboardHistory component: clipboardHistory changed:', newHistory)
  if (newHistory) {
    history.value = { ...newHistory }
    console.log('Updated local history:', history.value)
  }
}, { deep: true })

onMounted(async() => {
  console.log('ClipboardHistory component mounted')
  
  // This function forces a fresh read from storage
  const currentHistory = loadHistory()
  console.log('Initial history loaded:', currentHistory)
  
  // Assign to local state
  history.value = { ...currentHistory }
  console.log('Set initial history:', history.value)

  try {
    const response = await sendMessage('get-clipboard-history', {}) as unknown as { history: ClipboardHistory }
    console.log('Received history from background:', response)
    if (response && response.history && Array.isArray(response.history.items)) {
      history.value = response.history
      console.log('Updated history from background:', history.value)
    }
  } catch (e) {
    console.error('Failed to fetch initial clipboard history:', e)
  }

  // Set up runtime message listener for real-time updates
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('ClipboardHistory component: Received runtime message:', message)
    if (message.type === 'clipboard-updated' && message.data) {
      console.log('Received runtime clipboard-updated message:', message.data)
      const historyData = message.data as { history: ClipboardHistory }
      if (historyData.history && Array.isArray(historyData.history.items)) {
        history.value = historyData.history
        console.log('Updated history from runtime message:', historyData.history)
      }
    }
  })
})

const items = computed(() => {
  const arr = Array.isArray(history.value?.items) ? history.value.items : []
  console.log('Computed items:', arr.length, 'items')
  if (!search.value) return arr
  return arr.filter(item => item.content.toLowerCase().includes(search.value.toLowerCase()))
})

const maxItems = computed(() => history.value?.maxItems ?? 50)

interface ClipboardUpdateMessage {
  history: ClipboardHistory
}

// Enhanced message listener for clipboard updates
onMessage('clipboard-updated', ({ data }) => {
  console.log('ClipboardHistory component: Received clipboard-updated message:', data)
  if (data) {
    const message = data as unknown as ClipboardUpdateMessage
    if (message.history && Array.isArray(message.history.items)) {
      history.value = message.history
      console.log('Updated history from message:', message.history)
    } else {
      console.error('Received invalid history data:', message)
    }
  }
})

// Handle sync operations
onMessage('sync-operation', ({ data }) => {
  console.log('ClipboardHistory component: Received sync-operation message:', data)
  if (data && data.operation) {
    handleSyncOperation(data.operation)
    // Update local history after sync operation
    history.value = { ...clipboardHistory.value }
    console.log('Updated history from sync operation:', clipboardHistory.value)
  }
})

const copyToClipboard = async (content: string) => {
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, cannot copy to clipboard');
      return;
    }
    await navigator.clipboard.writeText(content)
  }
  catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

const formatDate = (timestamp: number) => {
  const now = Date.now()
  const diff = Math.floor((now - timestamp) / 60000)
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff} min${diff > 1 ? 's' : ''} ago`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return new Date(timestamp).toLocaleDateString()
}

const handleRemoveFromHistory = async (id: string) => {
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, cannot remove from history');
      return;
    }
    await removeFromHistory(id)
    // Update local state after removal
    history.value = { ...clipboardHistory.value }
    console.log('Removed item from history:', id)
  } catch (error) {
    console.error('Failed to remove from history:', error)
  }
}

const handleClearHistory = async () => {
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, cannot clear history');
      return;
    }
    await clearHistory()
    // Update local state after clear
    history.value = { ...clipboardHistory.value }
    console.log('Cleared history')
  } catch (error) {
    console.error('Failed to clear history:', error)
  }
}

// Handle permission events
const handlePermissionGranted = () => {
  console.log('Clipboard permission granted')
}

const handlePermissionDenied = () => {
  console.log('Clipboard permission denied')
}

const handlePermissionError = (error: any) => {
  console.error('Permission request error:', error)
}

// Ko-fi button click handler
const openKoFi = () => {
  const url = `https://ko-fi.com/${donationConfig.koFiUsername}`
  console.log('Opening Ko-fi URL:', url)
  console.log('Username from config:', donationConfig.koFiUsername)
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="clipboard-history bg-white rounded-xl w-full mx-auto p-0 border border-gray-100">
    <!-- Permission Request -->
    <PermissionRequest 
      @permission-granted="handlePermissionGranted"
      @permission-denied="handlePermissionDenied"
      @permission-error="handlePermissionError"
    />
    
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-600 rounded-t-xl">
      <div class="flex items-center gap-2">
        <span class="text-xl font-bold text-white tracking-wide">Clipboard History</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Simple status indicator -->
        <div class="flex items-center gap-1 text-white text-xs">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          <span>{{ items.length }} items</span>
        </div>
                 <!-- Ko-fi button with heart icon -->
         <button
           @click="openKoFi"
           class="ml-2 p-1.5 rounded-full hover:bg-white/20 transition-colors"
           :title="`Support me on Ko-fi`"
         >
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>
    </div>
    <!-- Search Bar -->
    <div class="px-6 py-3 bg-gray-50 flex items-center gap-2">
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input v-model="search" type="text" placeholder="Search items or tags" class="w-full bg-white rounded-full px-4 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400" />
    </div>
    <!-- List -->
    <div class="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
      <div v-for="item in items" :key="item.id" class="flex items-center px-6 py-3 hover:bg-green-50 transition group">
        <!-- Time badge -->
        <span class="text-xs font-semibold bg-green-100 text-green-700 rounded-full px-3 py-1 mr-4 min-w-[70px] text-center">{{ formatDate(item.timestamp) }}</span>
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span v-if="item.type === 'text' && copiedItemId === item.id" class="text-xs bg-gray-200 text-gray-600 rounded px-2 py-0.5">COPIED</span>
            <span :title="item.content" class="truncate text-sm font-medium text-gray-800 max-w-[340px]">{{ item.content }}</span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <!-- <span v-if="item.source" class="text-xs text-gray-400">from: {{ item.source }}</span> -->
          </div>
        </div>
        <!-- Actions -->
        <div class="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition">
          <button @click="copyToClipboard(item.content), currentCoppiedClipboard(item.content, item.id)" class="hover:bg-green-100 p-2 rounded-full" title="Copy"><svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="3" y="3" width="13" height="13" rx="2"/></svg></button>
          <button @click="handleRemoveFromHistory(item.id)" class="hover:bg-red-100 p-2 rounded-full" title="Delete"><svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 7V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2"/></svg></button>
        </div>
      </div>
      <div v-if="items.length === 0" class="text-center text-gray-400 py-12">
        <svg class="mx-auto mb-2 w-10 h-10 text-green-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><rect x="7" y="7" width="10" height="10" rx="2"/></svg>
        <p>No clipboard history yet</p>
      </div>
    </div>
    <!-- Footer -->
    <div class="border-t border-gray-100 bg-gray-50 rounded-b-xl">
      <!-- Main footer content -->
      <div class="flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">{{ items.length }} of {{ maxItems }} stored</span>
        </div>
        <button @click="handleClearHistory" class="text-xs text-red-500 hover:text-red-700 font-semibold">Clear All</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clipboard-history {
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
}
</style>