// Donation configuration
export const donationConfig = {
  // Your Ko-fi username (from your widget code)
  koFiUsername: 'G2G21BH5G5',
  
  // Button text (matching your widget)
  buttonText: 'Support me on Ko-fi',
  
  // Button color (from your widget: #72a4f2)
  buttonColor: '#72a4f2',
  
  // Show icon
  showIcon: true,
  
  // Enable/disable donate button
  enabled: true,
  
  // Show "Powered by Ko-fi" text
  showPoweredBy: true,
  
  // Custom Ko-fi URL (optional, will use username if not provided)
  customUrl: '',
  
  // Button position: 'footer' | 'header' | 'floating'
  position: 'footer'
}

// Helper function to get the full Ko-fi URL
export const getKoFiUrl = (): string => {
  if (donationConfig.customUrl) {
    return donationConfig.customUrl
  }
  return `https://ko-fi.com/${donationConfig.koFiUsername}`
}

// Helper function to check if donations are enabled
export const isDonationsEnabled = (): boolean => {
  return donationConfig.enabled
} 