const { app, BrowserWindow, screen, ipcMain, dialog, Menu, Tray, nativeImage, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')

// Tắt cache warnings
app.commandLine.appendSwitch('disable-http-cache')

// Đường dẫn file cấu hình
const configPath = path.join(app.getPath('userData'), 'config.json')

// Đọc cấu hình
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }
  } catch (err) {
    console.error('Error loading config:', err)
  }
  return { 
    gifPath: path.join(__dirname, 'e9 dance.gif'),
    clickThrough: false,
    position: 'bottom-right',
    customX: null,
    customY: null
  }
}

// Lưu cấu hình
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (err) {
    console.error('Error saving config:', err)
  }
}

let config = loadConfig()
let mainWin = null
let settingsWin = null
let tray = null

// Hàm tính vị trí dựa trên setting
function calculatePosition(position, winWidth, winHeight, customX = null, customY = null) {
  const { workArea } = screen.getPrimaryDisplay()
  let x, y
  
  switch(position) {
    case 'custom':
      // Sử dụng vị trí custom nếu có, không thì mặc định bottom-right
      if (customX !== null && customY !== null) {
        x = customX
        y = customY
      } else {
        x = workArea.x + workArea.width - winWidth
        y = workArea.y + workArea.height - winHeight
      }
      break
    case 'bottom-left':
      x = workArea.x
      y = workArea.y + workArea.height - winHeight
      break
    case 'top-right':
      x = workArea.x + workArea.width - winWidth
      y = workArea.y
      break
    case 'top-left':
      x = workArea.x
      y = workArea.y
      break
    case 'center':
      x = workArea.x + (workArea.width - winWidth) / 2
      y = workArea.y + (workArea.height - winHeight) / 2
      break
    case 'bottom-right':
    default:
      x = workArea.x + workArea.width - winWidth
      y = workArea.y + workArea.height - winHeight
      break
  }
  
  return { x, y }
}

app.on('ready', () => {
  // Kích thước cửa sổ nhân vật
  const winWidth = 200
  const winHeight = 200

  // Tính vị trí dựa trên config
  const { x, y } = calculatePosition(config.position || 'bottom-right', winWidth, winHeight, config.customX, config.customY)

  mainWin = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    movable: true, // Cho phép kéo cửa sổ
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  
  // Lắng nghe sự kiện kéo thả - lưu vị trí mới khi người dùng kéo
  mainWin.on('moved', () => {
    if (config.position === 'custom') {
      const [newX, newY] = mainWin.getPosition()
      config.customX = newX
      config.customY = newY
      saveConfig(config)
    }
  })

  // Tạo system tray icon với menu
  // Tạo icon đơn giản từ nativeImage
  try {
    // Tạo icon 16x16 màu trắng đơn giản
    const icon = nativeImage.createEmpty()
    const iconPath = path.join(__dirname, 'icon.png')
    
    if (fs.existsSync(iconPath)) {
      const iconImage = nativeImage.createFromPath(iconPath)
      if (!iconImage.isEmpty()) {
        tray = new Tray(iconImage.resize({ width: 16, height: 16 }))
      }
    }
    
    // Nếu không tạo được từ file, tạo icon trống
    if (!tray) {
      // Tạo icon đơn giản 16x16
      const emptyIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABNSURBVDiNY2AYBaNgFIyCUTAKRgEjAwPDfwYGhv8MDAwMDAwMDP8ZGBgY/jMwMPxnYGBg+M/AwPCfgYHhPwMDw38GBob/DAwM/xkYGEYBAABmBgYGBgYGBgAAAABJRU5ErkJggg==')
      tray = new Tray(emptyIcon)
    }
    
    function updateTrayMenu() {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Settings',
          click: () => openSettings()
        },
        {
          type: 'separator'
        },
        {
          label: 'Click-Through Mode',
          type: 'checkbox',
          checked: config.clickThrough,
          click: (menuItem) => {
            config.clickThrough = menuItem.checked
            saveConfig(config)
            if (mainWin) {
              mainWin.setIgnoreMouseEvents(config.clickThrough, { forward: true })
            }
            updateTrayMenu()
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          click: () => app.quit()
        }
      ])
      tray.setToolTip('Desktop Animation')
      tray.setContextMenu(contextMenu)
    }
    
    updateTrayMenu()
    tray.on('double-click', () => openSettings())
  } catch (err) {
    console.log('Tray icon disabled. Right-click animation to access settings.')
  }

  // Intelli-Hide: Xử lý sự kiện chuột
  let mouseCheckInterval = null
  
  ipcMain.on('mouse-entered', () => {
    if (!mainWin) return
    // Khi chuột vào, bắt đầu kiểm tra vị trí chuột
    if (mouseCheckInterval) clearInterval(mouseCheckInterval)
    
    mouseCheckInterval = setInterval(() => {
      const mousePos = screen.getCursorScreenPoint()
      const winBounds = mainWin.getBounds()
      
      // Kiểm tra xem chuột có còn trong vùng window không
      const isMouseInside = 
        mousePos.x >= winBounds.x &&
        mousePos.x <= winBounds.x + winBounds.width &&
        mousePos.y >= winBounds.y &&
        mousePos.y <= winBounds.y + winBounds.height
      
      if (!isMouseInside) {
        // Chuột đã rời khỏi → dừng kiểm tra và hiện lại
        clearInterval(mouseCheckInterval)
        mouseCheckInterval = null
        mainWin.webContents.send('show-character')
      }
    }, 50)
  })
  
  ipcMain.on('mouse-left', () => {
    // Dọn dẹp interval nếu có
    if (mouseCheckInterval) {
      clearInterval(mouseCheckInterval)
      mouseCheckInterval = null
    }
  })
  
  // Xử lý kéo thả - bật/tắt movable và click-through
  ipcMain.on('enable-dragging', () => {
    if (mainWin) {
      mainWin.setIgnoreMouseEvents(false)
    }
  })
  
  ipcMain.on('disable-dragging', () => {
    if (mainWin) {
      mainWin.setIgnoreMouseEvents(config.clickThrough, { forward: true })
    }
  })

  // Apply click-through setting
  function applyClickThrough() {
    if (mainWin) {
      mainWin.setIgnoreMouseEvents(config.clickThrough, { forward: true })
    }
  }
  
  applyClickThrough()

  mainWin.loadFile('index.html')
  mainWin.webContents.on('did-finish-load', () => {
    mainWin.webContents.send('set-gif', config.gifPath)
    mainWin.webContents.send('position-mode', config.position || 'bottom-right')
  })
  
  // Đăng ký global shortcut để mở settings
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    openSettings()
  })
})

app.on('will-quit', () => {
  // Hủy đăng ký shortcuts
  globalShortcut.unregisterAll()
})

// Mở cửa sổ settings
function openSettings() {
  if (settingsWin) {
    settingsWin.focus()
    return
  }
  
  settingsWin = new BrowserWindow({
    width: 400,
    height: 350,
    resizable: false,
    title: 'Settings',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  
  settingsWin.loadFile('settings.html')
  settingsWin.on('closed', () => {
    settingsWin = null
  })
}

// IPC handlers cho settings
ipcMain.handle('get-current-settings', () => {
  return {
    gifPath: config.gifPath,
    clickThrough: config.clickThrough || false,
    position: config.position || 'bottom-right',
    customX: config.customX,
    customY: config.customY
  }
})

ipcMain.handle('select-gif-file', async () => {
  const result = await dialog.showOpenDialog(settingsWin, {
    properties: ['openFile'],
    filters: [
      { name: 'GIF Images', extensions: ['gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.on('save-settings', (event, settings) => {
  config.gifPath = settings.gifPath
  config.clickThrough = settings.clickThrough
  config.position = settings.position
  saveConfig(config)
  
  // Cập nhật GIF và vị trí trong main window
  if (mainWin) {
    mainWin.webContents.send('set-gif', settings.gifPath)
    mainWin.webContents.send('position-mode', settings.position)
    mainWin.setIgnoreMouseEvents(settings.clickThrough, { forward: true })
    
    // Cập nhật vị trí (trừ khi ở chế độ custom - để người dùng tự kéo)
    if (settings.position !== 'custom') {
      const bounds = mainWin.getBounds()
      const { x, y } = calculatePosition(settings.position, bounds.width, bounds.height, config.customX, config.customY)
      mainWin.setPosition(x, y)
    }
  }
})

ipcMain.on('open-settings', () => {
  openSettings()
})
