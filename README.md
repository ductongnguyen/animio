# Animio - Desktop Animation Widget

A powerful desktop animation widget with multiple instances support and intelligent features.

## Features

- 🎬 **Multiple GIF Instances**: Add unlimited GIF animations on your desktop
- 📍 **Flexible Positioning**: 6 preset positions + custom drag-and-drop positioning
- 👻 **Intelli-Hide**: Animations fade out when you hover over them
- 🖱️ **Click-Through Mode**: Make animations non-interactive (clicks pass through)
- 🚀 **Auto Start**: Launch automatically with Windows
- 🎨 **Built-in Help Guide**: Complete usage instructions accessible in-app
- 💾 **Persistent Settings**: All configurations saved automatically
- 🎯 **System Tray**: Clean interface, no taskbar clutter

## Installation

### Development
```bash
npm install
npm start
```

### Building Executable

Install dependencies (first time only):
```bash
npm install
```

Build for your platform:
```bash
# Windows (creates installer + portable exe)
npm run build:win

# macOS (creates DMG + ZIP)
npm run build:mac

# Linux (creates AppImage + DEB)
npm run build:linux

# Build for all platforms
npm run build
```

Output will be in the `dist/` folder.

## Usage Guide

### 🚀 Getting Started

1. **First Launch**
   - Run the application (Animio.exe on Windows)
   - The settings window will open automatically
   - A default animation will appear on your desktop

2. **System Tray Icon**
   - Look for the Animio icon in your system tray (bottom-right corner)
   - This is your main control center for the app

### ⚙️ Opening Settings

There are multiple ways to access settings:

- **Right-click Animation**: Right-click on any animation on your desktop
- **System Tray Menu**: Right-click the tray icon → "Manage Instances"
- **Double-click Tray**: Double-click the system tray icon

### 🎬 Managing Multiple Animations

#### Adding New Animations
1. Open settings window
2. Click the **"+ Add New Instance"** button (green button, top-right)
3. A new animation will appear with default settings
4. Customize it using the options below

#### Configuring Each Animation

For each animation instance, you can customize:

**1. GIF File**
- Click **"Browse GIF"** button
- Select any GIF file from your computer
- The animation will update immediately

**2. Position**
Choose from 6 positioning options:
- **Bottom Right**: Default position (bottom-right corner)
- **Bottom Left**: Bottom-left corner
- **Top Right**: Top-right corner
- **Top Left**: Top-left corner
- **Center**: Center of screen
- **Custom (Drag)**: Manually position anywhere

**3. Click-Through Mode**
- ☑️ **Enabled**: Mouse clicks pass through the animation
- ☐ **Disabled**: Animation can be clicked and dragged

**4. Drag Mode**
- ☑️ **Enabled**: Animation becomes draggable when settings window is open
- ☐ **Disabled**: Animation cannot be dragged

#### Deleting Animations
- Click the **"Delete"** button on any instance card
- Confirm the deletion
- ⚠️ Note: You must keep at least 1 animation

### 📍 Positioning Your Animations

#### Method 1: Preset Positions
1. Open settings
2. Select a position from the dropdown (Bottom Right, Top Left, etc.)
3. Animation moves instantly

#### Method 2: Custom Positioning
1. In settings, select **"Custom (Drag)"** from position dropdown
2. Click and drag the animation anywhere on screen
3. Position is saved automatically when you release

#### Method 3: Drag Mode
1. Enable **"Drag Mode"** checkbox for the animation
2. Open settings window (animation becomes draggable)
3. Click and drag the animation to desired position
4. Position is saved automatically

### 👻 Intelli-Hide Feature

**How it works:**
- Move your mouse over an animation → it automatically fades out (becomes transparent)
- Move your mouse away → it fades back in
- This prevents animations from blocking your work

**When is it disabled?**
- When Click-Through mode is enabled
- When Drag Mode is enabled
- While dragging an animation

### 🚀 Auto-Start with Windows

**Enable Auto-Start:**
1. Right-click the system tray icon
2. Check **"Start with Windows"**
3. Animio will launch automatically when Windows starts

**Disable Auto-Start:**
1. Right-click the system tray icon
2. Uncheck **"Start with Windows"**

### ⌨️ Quick Actions

| Action | Description |
|--------|-------------|
| Right-click animation | Open context menu / settings |
| Double-click tray icon | Open settings window |
| Drag animation | Only works when Drag Mode is enabled and settings window is open |

### 💡 Tips & Tricks

1. **Multiple Characters**: Add multiple animations to create a lively desktop scene
2. **Work Mode**: Enable Click-Through on all animations to work without interruption
3. **Custom GIFs**: Use your favorite GIF files - anime characters, pets, memes, etc.
4. **Screen Corners**: Place animations in corners to avoid blocking important content
5. **Intelli-Hide**: Let animations fade when you need to see what's behind them

### ❓ Common Questions

**Q: How do I close the app?**
- Right-click the system tray icon → "Quit"

**Q: Can I use my own GIF files?**
- Yes! Click "Browse GIF" for any instance and select your file

**Q: Why can't I click on my animation?**
- Check if "Click-Through Mode" is enabled. Disable it to interact with the animation

**Q: How do I move an animation?**
- Enable "Drag Mode" checkbox, open settings window, then drag the animation to desired position. OR select "Custom (Drag)" position and drag it directly

**Q: Where are my settings saved?**
- Windows: `%APPDATA%/animio/config.json`
- All settings save automatically

## Configuration

Settings are stored in:
- Windows: `%APPDATA%/animio/config.json`
- macOS: `~/Library/Application Support/animio/config.json`
- Linux: `~/.config/animio/config.json`

## Files

- `index.js` - Main Electron process
- `index.html` - Animation window
- `settings.html` - Settings window
- `e9 dance.gif` - Default animation
