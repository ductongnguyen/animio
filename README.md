# Desktop Animation Widget

A cute desktop animation widget that sits on your taskbar with intelligent hide features.

## Features

- **Desktop Animation**: Displays a GIF animation at the bottom-right of your screen, touching the taskbar
- **Intelli-Hide**: Animation automatically fades out when you hover over it, allowing you to click through to items behind it
- **Customizable GIF**: Change the animation through the settings menu
- **System Tray**: Access settings and quit from the system tray icon
- **Persistent Settings**: Your GIF selection is saved and loaded on startup

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
You can open settings in three ways:
1. **Right-click** on the animation
2. **Right-click** the system tray icon → Settings
3. **Double-click** the system tray icon

### Changing the Animation
1. Open Settings
2. Click "Browse" to select a new GIF file
3. Preview will show your selected GIF
4. Click "Save & Apply" to update the animation

### Intelli-Hide Feature
- Move your mouse over the animation → it fades out
- Move your mouse away → it fades back in
- This allows you to click on taskbar icons or desktop items behind the animation

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
