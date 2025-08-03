# Ko-fi Donation Integration

This extension includes a built-in Ko-fi donation button to help support the development and maintenance of the extension.

## Current Setup

Your Ko-fi integration is configured with:
- **Username**: `G2G21BH5G5`
- **Button Text**: "Support me on Ko-fi"
- **Color**: `#72a4f2` (matching your widget)
- **Position**: Header of extension popup and sidepanel (heart icon)

## Setup Instructions

### 1. Your Ko-fi Widget Code

Your original Ko-fi widget code:
```html
<script type='text/javascript' src='https://storage.ko-fi.com/cdn/widget/Widget_2.js'></script>
<script type='text/javascript'>kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'G2G21BH5G5');kofiwidget2.draw();</script>
```

### 2. Configuration

The extension uses your widget details in `src/config/donations.ts`:

```typescript
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
```

### 3. Customization Options

#### Change Button Text
```typescript
buttonText: 'Buy me a coffee ☕'
buttonText: 'Support the developer 🚀'
buttonText: 'Donate to help development 💝'
```

#### Change Button Color
```typescript
buttonColor: '#72a4f2'  // Your current color
buttonColor: '#ff6b6b'  // Red
buttonColor: '#51cf66'  // Green
buttonColor: '#ffd43b'  // Yellow
```

#### Disable Donations
```typescript
enabled: false
```

#### Use Embedded Widget
To use the actual Ko-fi widget instead of a custom button, edit `ClipboardHistory.vue`:
```vue
<KoFiWidget 
  :username="donationConfig.koFiUsername"
  :text="donationConfig.buttonText"
  :color="donationConfig.buttonColor"
  :showWidget="true"  <!-- Change to true -->
/>
```

### 4. Button Placement

The donate button appears in the header of both:
- **Extension popup** (when you click the extension icon)
- **Sidepanel** (if users have it enabled)

The button is displayed as a simple heart icon (❤️) in the top-right corner of the header, next to the item count.

### 5. Testing

1. Build the extension: `npm run build`
2. Load the extension in Chrome
3. Open the popup and check the footer for the donate button
4. Click the button to ensure it opens your Ko-fi page: `https://ko-fi.com/G2G21BH5G5`

## Features

- ✅ **One-click donation**: Opens your Ko-fi page in a new tab
- ✅ **Simple heart icon**: Clean, minimal design in the header
- ✅ **Responsive**: Works in both popup and sidepanel
- ✅ **Accessible**: Proper ARIA labels and keyboard navigation
- ✅ **Non-intrusive**: Placed in the header, doesn't interfere with functionality
- ✅ **Hover effects**: Subtle hover animation for better UX

## Best Practices

1. **Be transparent**: Let users know what their donations support
2. **Keep it optional**: Users should feel comfortable using the extension without donating
3. **Update regularly**: Keep your Ko-fi page updated with your latest work
4. **Show appreciation**: Consider adding a thank you message for donors

## Troubleshooting

### Button not appearing
- Check that `enabled: true` in the config
- Verify your Ko-fi username is correct: `G2G21BH5G5`
- Check the browser console for errors

### Wrong Ko-fi page opens
- Double-check your username in the config
- Test the URL manually: `https://ko-fi.com/G2G21BH5G5`

### Button styling issues
- Ensure the color is a valid CSS color
- Check that the component is properly imported

## Legal Considerations

- Ensure you comply with Ko-fi's terms of service
- Be transparent about how donations are used
- Consider adding a privacy policy if you collect any user data

## Alternative Donation Platforms

If you prefer other donation platforms, you can modify the `KoFiWidget.vue` component to use:

- **Buy Me a Coffee**: `https://www.buymeacoffee.com/`
- **Patreon**: `https://www.patreon.com/`
- **GitHub Sponsors**: `https://github.com/sponsors/`
- **PayPal**: `https://www.paypal.com/`

Simply update the URL and styling to match your chosen platform. 