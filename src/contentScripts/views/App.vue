<script setup lang="ts">
import { useToggle } from '@vueuse/core'
import { ref, onMounted, computed } from 'vue'
// import { onMessage, sendMessage } from 'webext-bridge/content-script'
import 'uno.css'
import { clipboardHistory, type ClipboardHistory } from '~/logic/storage'
import logo from '~/assets/icon-512.png'
import ClipboardHistoryComponent from '~/components/ClipboardHistory.vue'

// import { Button } from '@/components/ui/button'
// import ListItem  from '@/components/ListItem.vue'
// import { ref, onMounted } from 'vue'

// Helper function to check if extension context is still valid
// const isExtensionContextValid = () => {
//   try {
//     // Try to access browser API - if it fails, context is invalid
//     return typeof browser !== 'undefined' && browser.runtime && browser.runtime.id;
//   } catch (e) {
//     return false;
//   }
// }

// Ensure history is properly initialized with a default value if needed
const _history = ref(clipboardHistory.value || { items: [], maxItems: 50 })

const [show, _toggle] = useToggle(false)

// Listen for clipboard updates
// onMessage('clipboard-updated', ({ data }) => {
//   if (data) {
//     // First cast to unknown, then to our type
//     const message = data as unknown as { history: ClipboardHistory }
//     // Ensure we have a valid history object with an items array
//     if (message.history && Array.isArray(message.history.items)) {
//       history.value = message.history
//     } else {
//       console.error('Received invalid history data:', message)
//     }
//   }
// })

// Copy item to clipboard
// const copyToClipboard = async (content: string) => {
//   try {
//     // Check if extension context is still valid
//     if (!isExtensionContextValid()) {
//       console.warn('Extension context invalidated, cannot copy to clipboard');
//       return;
//     }

//     await navigator.clipboard.writeText(content)
//   }
//   catch (error) {
//     console.error('Failed to copy to clipboard:', error)
//   }
// }

// Format timestamp
// const formatDate = (timestamp: number) => {
//   return new Date(timestamp).toLocaleString()
// }

// onMounted(async () => {
//   try {
//     const response = await sendMessage('get-clipboard-history', {}) as unknown as { history: ClipboardHistory }
//     if (response && response.history && Array.isArray(response.history.items)) {
//       history.value = response.history
//     }
//   } catch (e) {
//     console.error('Failed to fetch initial clipboard history:', e)
//   }
// })
</script>

<template>
  <div class="fixed shadow-lg right-0 bottom-0 z-[1000] flex items-end font-sans select-none max-w-xl">
    <div
      v-show="show"
      class="bg-white text-gray-800 rounded-lg shadow w-max h-min"
      m="y-auto r-2"
      transition="opacity duration-300"
      :class="show ? 'opacity-100' : 'opacity-0'"
    >
      <main class="text-center text-gray-700 shadow-sm">
        <ClipboardHistoryComponent class="max-w-80" />
      </main>
    </div>
  </div>
</template>
