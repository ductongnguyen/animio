# Anima E - Desktop Animation Widget

A powerful desktop animation widget with multiple instances support and intelligent features.

## Features

- 🎬 **Multiple GIF Instances**: Add unlimited GIF animations on your desktop
- 📍 **Flexible Positioning**: 6 preset positions + custom drag-and-drop positioning
- 👻 **Intelli-Hide**: Animations fade out when you hover over them
- 🖱️ **Click-Through Mode**: Make animations non-interactive (clicks pass through)
- 🚀 **Auto Start**: Launch automatically with Windows
- ⌨️ **Global Shortcuts**: Ctrl+Shift+S to open settings, Alt+Drag to reposition
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

## Usage

### Opening Settings
- **Keyboard**: Press `Ctrl+Shift+S`
- **Right-click** on any animation
- **Right-click** the system tray icon → "Manage Instances"
- **Double-click** the system tray icon

### Managing Instances
1. Click "+ Add New Instance" to create a new animation
2. For each instance, you can:
   - **Browse GIF**: Select a different GIF file
   - **Position**: Choose from 6 presets or Custom (drag to position)
   - **Click-Through**: Enable to make animation non-interactive
   - **Delete**: Remove the instance (must keep at least 1)

### Positioning Animations
- **Preset Positions**: Bottom Right, Bottom Left, Top Right, Top Left, Center
- **Custom Position**: 
  - Select "Custom (Drag)" in position dropdown
  - Click and drag the animation anywhere on screen
  - Or hold `Alt` key and drag any animation temporarily

### Auto Start with Windows
- Right-click system tray icon
- Check "Start with Windows"
- App will launch automatically on Windows startup

### Intelli-Hide Feature
- Move your mouse over an animation → it fades out
- Move your mouse away → it fades back in
- Disabled when in drag mode or click-through mode

## Configuration

Settings are stored in:
- Windows: `%APPDATA%/anima-e/config.json`
- macOS: `~/Library/Application Support/anima-e/config.json`
- Linux: `~/.config/anima-e/config.json`

## Files

- `index.js` - Main Electron process
- `index.html` - Animation window
- `settings.html` - Settings window
- `e9 dance.gif` - Default animation
