<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { permissionManager } from '~/logic/permissions'

const showRequest = ref(false)
const isRequesting = ref(false)
const permissionStatus = ref<'granted' | 'denied' | 'prompt'>('prompt')

onMounted(async () => {
  // Check current permission status
  const status = permissionManager.getPermissionStatus()
  permissionStatus.value = status.clipboard
  
  // Show request if needed
  showRequest.value = permissionManager.shouldShowPermissionRequest()
})

const requestPermission = async () => {
  try {
    isRequesting.value = true
    const granted = await permissionManager.requestClipboardPermission()
    
    if (granted) {
      permissionStatus.value = 'granted'
      showRequest.value = false
      // Emit success event
      emit('permission-granted')
    } else {
      permissionStatus.value = 'denied'
      // Emit denied event
      emit('permission-denied')
    }
  } catch (error) {
    console.error('Failed to request permission:', error)
    permissionStatus.value = 'denied'
    emit('permission-error', error)
  } finally {
    isRequesting.value = false
  }
}

const resetPermission = () => {
  permissionManager.resetPermissionStatus()
  permissionStatus.value = 'prompt'
  showRequest.value = true
}

const emit = defineEmits<{
  'permission-granted': []
  'permission-denied': []
  'permission-error': [error: any]
}>()
</script>

<template>
  <div v-if="showRequest" class="permission-request bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div class="flex-shrink-0">
        <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
      </div>
      
      <!-- Content -->
      <div class="flex-1">
        <h3 class="text-sm font-medium text-yellow-800 mb-1">
          Clipboard Permission Required
        </h3>
        <p class="text-sm text-yellow-700 mb-3">
          This extension needs clipboard access to save your copied items. 
          Your clipboard data is stored locally and never shared.
        </p>
        
        <!-- Action Buttons -->
        <div class="flex gap-2">
          <button 
            @click="requestPermission"
            :disabled="isRequesting"
            class="px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isRequesting">Requesting...</span>
            <span v-else>Grant Permission</span>
          </button>
          
          <button 
            @click="resetPermission"
            class="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
    
    <!-- Status Messages -->
    <div v-if="permissionStatus === 'denied'" class="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
      <p>Permission was denied. You can reset this in your browser settings or click "Reset" above.</p>
    </div>
    
    <div v-if="permissionStatus === 'granted'" class="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
      <p>✓ Clipboard permission granted! The extension is now fully functional.</p>
    </div>
  </div>
</template>

<style scoped>
.permission-request {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 