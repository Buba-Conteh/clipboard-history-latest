<script setup lang="ts">
import { ref, computed,onMounted } from 'vue'
import { onMessage, sendMessage } from 'webext-bridge/popup'
import { clipboardHistory, removeFromHistory,loadHistory, clearHistory, type ClipboardHistory } from '~/logic/storage'
// import { onMessage, sendMessage } from 'webext-bridge/content-script'

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

onMounted(async() => {
  // This function forces a fresh read from storag
  const currentHistory = loadHistory()
  console.log('Initial history loaded:', currentHistory)
  
  // Assign to local state
  history.value = { ...currentHistory }

  try {
    const response = await sendMessage('get-clipboard-history', {}) as unknown as { history: ClipboardHistory }
    if (response && response.history && Array.isArray(response.history.items)) {
      history.value = response.history
      console.log('Initial history loaded with sync:', currentHistory)
    }
  } catch (e) {
    console.error('Failed to fetch initial clipboard history:', e)
  }

})

const items = computed(() => {
  const arr = Array.isArray(history.value?.items) ? history.value.items : []
  if (!search.value) return arr
  return arr.filter(item => item.content.toLowerCase().includes(search.value.toLowerCase()))
})

const maxItems = computed(() => history.value?.maxItems ?? 50)

interface ClipboardUpdateMessage {
  history: ClipboardHistory
}

onMessage('clipboard-updated', ({ data }) => {
  if (data) {
    const message = data as unknown as ClipboardUpdateMessage
    if (message.history && Array.isArray(message.history.items)) {
      history.value = message.history
    } else {
      console.error('Received invalid history data:', message)
    }
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

const handleRemoveFromHistory = (id: string) => {
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, cannot remove from history');
      return;
    }
    removeFromHistory(id)
  } catch (error) {
    console.error('Failed to remove from history:', error)
  }
}

const handleClearHistory = () => {
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, cannot clear history');
      return;
    }
    clearHistory()
  } catch (error) {
    console.error('Failed to clear history:', error)
  }
}
</script>
<style>

</style>

<template>
  <div class="clipboard-history bg-white rounded-xl w-full mx-auto p-0 border border-gray-100">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-600 rounded-t-xl">
      <div class="flex items-center gap-2">
        <!-- <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" stroke-width="2" ><rect x="4" y="4" width="16" height="16" rx="4" fill="white"/><rect x="7" y="7" width="10" height="10" rx="2" fill="#22c55e"/></svg> -->
        <span class="text-xl font-bold text-white tracking-wide">Clipboard History</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Placeholder icons -->
        <!-- <button class="hover:bg-green-100 p-2 rounded-full!"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20v-6m0 0V4m0 10H6m6 0h6"/></svg></button>
        <button class="hover:bg-green-100 p-2 rounded-full"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button>
        <button class="hover:bg-green-100 p-2 rounded-full"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg></button>
        <button class="hover:bg-green-100 p-2 rounded-full"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg></button> -->
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
            <!-- <span class="text-xs text-gray-400">from: {{ item.content  }}</span> -->
            <!-- <span v-if="item.source" class="text-xs text-gray-400">from: {{ item.source }}</span> -->
            <!-- <span class="text-xs text-gray-400">ID: {{ item.id.slice(0, 6) }}</span> -->
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
    <div class="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
      <span class="text-xs text-gray-400">{{ items.length }} of {{ maxItems }} stored</span>
      <button @click="handleClearHistory" class="text-xs text-red-500 hover:text-red-700 font-semibold">Clear All</button>
    </div>
  </div>
</template>

<style scoped>
.clipboard-history {
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
}
</style>