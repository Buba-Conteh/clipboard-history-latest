<script setup lang="ts">
import { onMounted, ref } from 'vue'

// Extend Window interface for Ko-fi widget
declare global {
  interface Window {
    kofiwidget2?: {
      init: (text: string, color: string, username: string) => void
      draw: () => void
    }
  }
}

interface Props {
  username: string
  text?: string
  color?: string
  showWidget?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  username: 'G2G21BH5G5',
  text: 'Support me on Ko-fi',
  color: '#72a4f2',
  showWidget: false
})

const widgetContainer = ref<HTMLDivElement>()

onMounted(() => {
  if (props.showWidget && widgetContainer.value) {
    // Load Ko-fi widget script
    const script = document.createElement('script')
    script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js'
    script.onload = () => {
      // Initialize the widget
      if (window.kofiwidget2) {
        window.kofiwidget2.init(props.text, props.color, props.username)
        window.kofiwidget2.draw()
      }
    }
    document.head.appendChild(script)
  }
})
</script>

<template>
  <div class="ko-fi-widget-container">
    <!-- Option 1: Custom button (default) -->
    <div v-if="!showWidget" class="donate-button-container">
      <button
        @click="window.open(`https://ko-fi.com/${username}`, '_blank', 'noopener,noreferrer')"
        class="donate-button"
        :style="{ backgroundColor: color, borderColor: color }"
        :title="`Support the developer on Ko-fi`"
      >
        <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        {{ text }}
      </button>
      
      <div class="text-xs text-gray-500 mt-1 text-center">
        Powered by <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600">Ko-fi</a>
      </div>
    </div>

    <!-- Option 2: Embedded Ko-fi widget -->
    <div v-else ref="widgetContainer" class="ko-fi-widget">
      <!-- Widget will be injected here by the Ko-fi script -->
    </div>
  </div>
</template>

<style scoped>
.ko-fi-widget-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
}

.donate-button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
}

.donate-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid;
  min-width: 140px;
  color: white;
}

.donate-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  opacity: 0.9;
}

.donate-button:active {
  transform: translateY(0);
}

.ko-fi-widget {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 40px;
}
</style> 