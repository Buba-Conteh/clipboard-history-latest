/* eslint-disable no-console */
import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { createApp } from 'vue'
import App from './views/App.vue'
import { setupApp } from '~/logic/common-setup'
import { permissionManager } from '~/logic/permissions'
// import { storageDemo } from '~/logic/storage'

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  console.info('[vitesse-webext] Hello world from content script')

  // Helper function to check if extension context is still valid
  const isExtensionContextValid = () => {
    try {
      // Try to access browser API - if it fails, context is invalid
      return typeof browser !== 'undefined' && browser.runtime && browser.runtime.id;
    } catch (e) {
      return false;
    }
  }

  // Track if we have clipboard permission
  let hasClipboardPermission = false

  // Initialize permission check
  const initializePermission = async () => {
    try {
      // First check if permission is actually granted by testing the browser API
      hasClipboardPermission = await permissionManager.isPermissionActuallyGranted()
      
      if (hasClipboardPermission) {
        console.log('Permission actually granted, updating storage')
        // Update storage to reflect the actual permission status
        const status = permissionManager.getPermissionStatus()
        if (status.clipboard !== 'granted') {
          // Update the stored status to reflect that permission is granted
          await permissionManager.requestClipboardPermission()
        }
      } else {
        // Only check with browser if we haven't asked before
        if (permissionManager.shouldShowPermissionRequest()) {
          hasClipboardPermission = await permissionManager.checkClipboardPermission()
        }
      }
      
      console.log('Clipboard permission status:', hasClipboardPermission)
    } catch (error) {
      console.error('Failed to check clipboard permission:', error)
      hasClipboardPermission = false
    }
  }

  // Initialize permission on script load
  initializePermission()

  // Monitor clipboard changes with permission handling
  document.addEventListener('copy', async () => {
    console.log('Copy event detected')
    
    try {
      // First check if permission is actually granted by testing the browser API
      const actuallyGranted = await permissionManager.isPermissionActuallyGranted()
      if (actuallyGranted) {
        hasClipboardPermission = true
        console.log('Permission actually granted, proceeding with copy event')
      } else if (!hasClipboardPermission) {
        console.log('No clipboard permission, checking if we should request...')
        
        // Only request permission if we haven't asked before
        if (permissionManager.shouldShowPermissionRequest()) {
          console.log('Requesting clipboard permission...')
          hasClipboardPermission = await permissionManager.requestClipboardPermission()
        } else {
          console.log('Permission already requested before, respecting user choice')
          return
        }
        
        if (!hasClipboardPermission) {
          console.log('Clipboard permission denied, skipping copy event')
          return
        }
      }

      console.log('Permission granted, reading clipboard...')

      // Small delay to ensure clipboard is updated
      setTimeout(async () => {
        try {
          // Check if extension context is still valid before proceeding
          if (!isExtensionContextValid()) {
            console.warn('Extension context invalidated, skipping clipboard operation');
            return;
          }

          // Double-check permission before reading clipboard
          if (!hasClipboardPermission) {
            hasClipboardPermission = await permissionManager.checkClipboardPermission()
            if (!hasClipboardPermission) {
              console.log('Permission check failed')
              return
            }
          }

          console.log('Reading clipboard text...')
          const text = await navigator.clipboard.readText()
          console.log('Clipboard text:', text)
          
          if (text) {
            console.log('Sending clipboard-copied message with content:', text)
            sendMessage('clipboard-copied', { content: text })
            console.log('Message sent successfully')
          } else {
            console.log('No text in clipboard')
          }
        } catch (error) {
          console.error('Failed to read clipboard after copy:', error)
          
          // If we get a permission error, update our permission status
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            console.log('Permission denied, updating status')
            hasClipboardPermission = false
            // Don't reset permission status here - let the user decide when to reset
          }
        }
      }, 100)
    } catch (error) {
      console.error('Failed to handle copy event:', error)
    }
  })

  // Handle paste events to track usage (with permission check)
  document.addEventListener('paste', async () => {
    console.log('Paste event detected')
    
    try {
      // Check if extension context is still valid before proceeding
      if (!isExtensionContextValid()) {
        console.warn('Extension context invalidated, skipping clipboard operation');
        return;
      }

      // Check permission before reading clipboard
      if (!hasClipboardPermission) {
        hasClipboardPermission = await permissionManager.isPermissionActuallyGranted()
        if (!hasClipboardPermission) {
          console.log('No clipboard permission for paste event')
          return
        }
      }

      // Small delay to ensure clipboard is updated
      setTimeout(async () => {
        try {
          console.log('Reading clipboard text for paste event...')
          const text = await navigator.clipboard.readText()
          console.log('Clipboard text for paste:', text)
          
          if (text) {
            console.log('Sending clipboard-pasted message with content:', text)
            sendMessage('clipboard-pasted', { content: text })
            console.log('Paste message sent successfully')
          } else {
            console.log('No text in clipboard for paste')
          }
        } catch (error) {
          console.error('Failed to read clipboard for paste event:', error)
          
          // If we get a permission error, update our permission status
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            console.log('Permission denied for paste, updating status')
            hasClipboardPermission = false
          }
        }
      }, 100)
    } catch (error) {
      console.error('Failed to handle paste event:', error)
    }
  })

  // communication example: send previous tab title from background page
  onMessage('tab-prev', ({ data }) => {
    console.log(`[vitesse-webext] Navigate from page "${data.title}"`)
  })

  // mount component to context window
  const container = document.createElement('div')
  container.id = __NAME__
  const root = document.createElement('div')
  const styleEl = document.createElement('link')
  const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container
  styleEl.setAttribute('rel', 'stylesheet')
  styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))
  shadowDOM.appendChild(styleEl)
  shadowDOM.appendChild(root)
  document.body.appendChild(container)
  const app = createApp(App)
  setupApp(app)
  app.mount(root)
})()
