<script setup lang="ts">
import { ref } from 'vue'
import { donationConfig, getKoFiUrl, isDonationsEnabled } from '~/config/donations'

interface Props {
  koFiUsername?: string
  buttonText?: string
  buttonColor?: string
  showIcon?: boolean
  showPoweredBy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  koFiUsername: donationConfig.koFiUsername,
  buttonText: donationConfig.buttonText,
  buttonColor: donationConfig.buttonColor,
  showIcon: donationConfig.showIcon,
  showPoweredBy: donationConfig.showPoweredBy
})

const isHovered = ref(false)

const koFiUrl = getKoFiUrl()

const openKoFi = () => {
  // Open Ko-fi in a new tab
  window.open(koFiUrl, '_blank', 'noopener,noreferrer')
}

const buttonStyle = {
  backgroundColor: props.buttonColor,
  borderColor: props.buttonColor,
  color: 'white'
}

const hoverStyle = {
  backgroundColor: '#1a8bc0', // Darker shade for hover
  borderColor: '#1a8bc0',
  color: 'white'
}

// Don't render if donations are disabled
if (!isDonationsEnabled()) {
  // Return empty template
  defineExpose({})
}
</script>

<template>
  <div v-if="isDonationsEnabled()" class="donate-button-container">
    <button
      @click="openKoFi"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
      :style="isHovered ? hoverStyle : buttonStyle"
      class="donate-button"
      :title="`Support the developer on Ko-fi`"
    >
      <svg v-if="showIcon" class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      {{ buttonText }}
    </button>
    
    <!-- Optional: Add a small "Powered by Ko-fi" text -->
    <div v-if="showPoweredBy" class="text-xs text-gray-500 mt-1 text-center">
      Powered by <a :href="koFiUrl" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600">Ko-fi</a>
    </div>
  </div>
</template>

<style scoped>
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
}

.donate-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.donate-button:active {
  transform: translateY(0);
}
</style> 