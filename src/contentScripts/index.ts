/* eslint-disable no-console */
import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { createApp } from 'vue'
import App from './views/App.vue'
import { setupApp } from '~/logic/common-setup'
import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'
import { log } from 'console'
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

  // Monitor clipboard changes
  document.addEventListener('copy', async () => {
    try {
      // Small delay to ensure clipboard is updated
      setTimeout(async () => {
        try {
          // Check if extension context is still valid before proceeding
          if (!isExtensionContextValid()) {
            console.warn('Extension context invalidated, skipping clipboard operation');
            return;
          }

          const text = await navigator.clipboard.readText()
          if (text) {
            sendMessage('clipboard-copied', { content: text })
          }
        } catch (error) {
          console.error('Failed to read clipboard after copy:', error)
        }
      }, 100)
    } catch (error) {
      console.error('Failed to handle copy event:', error)
    }
  })

  // Handle paste events to track usage
  document.addEventListener('paste', async () => {
    try {
      // Check if extension context is still valid before proceeding
      if (!isExtensionContextValid()) {
        console.warn('Extension context invalidated, skipping clipboard operation');
        return;
      }

      const text = await navigator.clipboard.readText()
      if (text) {
        sendMessage('clipboard-pasted', { content: text })
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error)
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
