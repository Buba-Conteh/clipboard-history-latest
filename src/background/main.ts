import { onMessage, sendMessage } from 'webext-bridge/background'
import { addToHistory, clipboardHistory, type ClipboardHistory, ensureValidHistory } from '~/logic/storage'

import type { Tabs } from 'webextension-polyfill'

interface ClipboardMessage {
  content: string
}

// Helper function to check if extension context is still valid
const isExtensionContextValid = () => {
  try {
    // Try to access browser API - if it fails, context is invalid
    return typeof browser !== 'undefined' && browser.runtime && browser.runtime.id;
  } catch (e) {
    return false;
  }
}

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  // load latest content script
  import('./contentScriptHMR')
}

// remove or turn this off if you don't use side panel
const USE_SIDE_PANEL = true

// to toggle the sidepanel with the action button in chromium:
if (USE_SIDE_PANEL) {
  // @ts-expect-error missing types
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error))
}

browser.action.onClicked.addListener(() => {
  browser.action.openPopup() // Ensure it opens the popup
})

browser.runtime.onInstalled.addListener((): void => {
  console.log('Extension installed')
})

// Handle clipboard monitoring
let previousTabId = 0

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId
    return
  }

  let tab: Tabs.Tab

  try {
    tab = await browser.tabs.get(previousTabId)
    previousTabId = tabId
  }
  catch {
    return
  }
})

// Handle messages from content script
onMessage('clipboard-copied', async ({ data, sender }) => {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.warn('Extension context invalidated, skipping clipboard operation');
    return;
  }

  // First cast to unknown, then to our type
  const message = data as unknown as ClipboardMessage
  if (!message?.content) return

  // Get tab info safely
  let source = 'Unknown source'
  try {
    if (sender.tabId) {
      const tab = await browser.tabs.get(sender.tabId)
      source = tab.title || 'Unknown source'
    }
  } catch (error) {
    console.error('Failed to get tab info:', error)
  }

  addToHistory(message.content, 'text', source)

  // Ensure we have valid history data before sending
  const validHistory = ensureValidHistory(clipboardHistory.value)

  // Notify popup/sidepanel about the update
  const historyData = {
    history: JSON.parse(JSON.stringify(validHistory))
  }

  // Broadcast the update to all contexts
  try {
    // @ts-expect-error webext-bridge types are not complete
    sendMessage('clipboard-updated', historyData, { context: 'popup' })
  } catch (error) {
    console.error('Failed to send message to popup:', error)
  }

  try {
    // @ts-expect-error webext-bridge types are not complete
    sendMessage('clipboard-updated', historyData, { context: 'sidepanel' })
  } catch (error) {
    console.error('Failed to send message to sidepanel:', error)
  }

  // Also send to content script if it's listening
  try {
    if (sender.tabId) {
      // @ts-expect-error webext-bridge types are not complete
      sendMessage('clipboard-updated', historyData, { tabId: sender.tabId })
    }
  } catch (error) {
    console.error('Failed to send message to content script:', error)
  }
})

// Handle requests for clipboard history
onMessage('get-clipboard-history', () => {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.warn('Extension context invalidated, returning empty history');
    return { history: { items: [], maxItems: 50 } };
  }

  // Ensure we have valid history data before sending
  const validHistory = ensureValidHistory(clipboardHistory.value)

  return {
    history: JSON.parse(JSON.stringify(validHistory))
  }
})
