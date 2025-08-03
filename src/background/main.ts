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
  console.log('Received clipboard-copied message:', data, 'from sender:', sender)
  
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.warn('Extension context invalidated, skipping clipboard operation');
    return;
  }

  // First cast to unknown, then to our type
  const message = data as unknown as ClipboardMessage
  if (!message?.content) {
    console.warn('No content in clipboard message')
    return
  }

  console.log('Processing clipboard content:', message.content)

  // Get tab info safely
  let source = 'Unknown source'
  try {
    if (sender.tabId) {
      const tab = await browser.tabs.get(sender.tabId)
      source = tab.title || 'Unknown source'
      console.log('Source tab:', source)
    }
  } catch (error) {
    console.error('Failed to get tab info:', error)
  }

  // Use the enhanced addToHistory function that includes sync
  console.log('Adding to history...')
  await addToHistory(message.content, 'text', source)
  console.log('Successfully added to history')

  // Ensure we have valid history data before sending
  const validHistory = ensureValidHistory(clipboardHistory.value)
  console.log('Current history after update:', validHistory)

  // Notify popup/sidepanel about the update
  const historyData = {
    history: JSON.parse(JSON.stringify(validHistory))
  }

  console.log('Broadcasting history update:', historyData)

  // Broadcast to all contexts
  try {
    // Send to popup and sidepanel
    await browser.runtime.sendMessage({
      type: 'clipboard-updated',
      data: historyData
    })
    console.log('Successfully sent message to popup/sidepanel')
  } catch (error) {
    console.log('Failed to send message to popup/sidepanel:', error)
  }

  // Broadcast to content scripts in all tabs
  try {
    const tabs = await browser.tabs.query({})
    console.log('Broadcasting to', tabs.length, 'tabs')
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: 'clipboard-updated',
            data: historyData
          })
          console.log('Successfully sent message to tab', tab.id)
        } catch (error) {
          console.log('Failed to send message to tab', tab.id, ':', error)
        }
      }
    }
  } catch (error) {
    console.error('Failed to broadcast to tabs:', error)
  }
})

// Handle requests for clipboard history
onMessage('get-clipboard-history', () => {
  console.log('Received get-clipboard-history request')
  
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.warn('Extension context invalidated, returning empty history');
    return { history: { items: [], maxItems: 50 } };
  }

  // Ensure we have valid history data before sending
  const validHistory = ensureValidHistory(clipboardHistory.value)
  console.log('Returning history:', validHistory)

  return {
    history: JSON.parse(JSON.stringify(validHistory))
  }
})
