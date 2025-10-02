const { app, BrowserWindow, screen, ipcMain, dialog, Menu, Tray, nativeImage } = require('electron')
const AutoLaunch = require('auto-launch')
const path = require('path')
const fs = require('fs')

// Kiểm tra môi trường
const isDev = !app.isPackaged

// Tắt cache warnings
app.commandLine.appendSwitch('disable-http-cache')

// Đường dẫn file cấu hình
const configPath = path.join(app.getPath('userData'), 'config.json')

// Đọc cấu hình
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      console.log('Config loaded from:', configPath)
      console.log('Instances count:', config.instances ? config.instances.length : 0)
      
      // Migration: chuyển từ config cũ sang config mới với instances
      if (!config.instances && config.gifPath) {
        console.log('Migrating old config to new format')
        return {
          instances: [{
            id: 'default',
            gifPath: config.gifPath,
            clickThrough: config.clickThrough || false,
            dragMode: false,
            position: config.position || 'bottom-right',
            customX: config.customX || null,
            customY: config.customY || null
          }]
        }
      }
      
      // Migration: thêm dragMode cho instances cũ
      if (config.instances) {
        config.instances.forEach(instance => {
          if (instance.dragMode === undefined) {
            instance.dragMode = false
          }
        })
      }
      
      return config
    }
  } catch (err) {
    console.error('Error loading config:', err)
  }
  console.log('Creating default config')
  return { 
    instances: [{
      id: 'default',
      gifPath: path.join(__dirname, 'default.gif'),
      clickThrough: false,
      dragMode: false,
      position: 'bottom-right',
      customX: null,
      customY: null
    }],
    autoStart: false
  }
}

// Lưu cấu hình
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log('Config saved:', configPath)
  } catch (err) {
    console.error('Error saving config:', err)
  }
}

let config = loadConfig()
let windows = {} // Object để lưu các window instances: { instanceId: BrowserWindow }
let settingsWin = null
let helpWin = null
let tray = null

// Cấu hình auto launch
const autoLauncher = new AutoLaunch({
  name: 'Animio',
  path: app.getPath('exe'),
  isHidden: true,
})

// Hàm tính vị trí dựa trên setting
function calculatePosition(position, winWidth, winHeight, customX = null, customY = null) {
  const display = screen.getPrimaryDisplay()
  const { bounds } = display // Sử dụng bounds thay vì workArea để có thể đè lên taskbar
  let x, y
  
  switch(position) {
    case 'custom':
      // Sử dụng vị trí custom nếu có, không thì mặc định bottom-right
      if (customX !== null && customY !== null) {
        x = customX
        y = customY
      } else {
        x = bounds.x + bounds.width - winWidth
        y = bounds.y + bounds.height - winHeight
      }
      break
    case 'bottom-left':
      x = bounds.x
      y = bounds.y + bounds.height - winHeight
      break
    case 'top-right':
      x = bounds.x + bounds.width - winWidth
      y = bounds.y
      break
    case 'top-left':
      x = bounds.x
      y = bounds.y
      break
    case 'center':
      x = bounds.x + (bounds.width - winWidth) / 2
      y = bounds.y + (bounds.height - winHeight) / 2
      break
    case 'bottom-right':
    default:
      x = bounds.x + bounds.width - winWidth
      y = bounds.y + bounds.height - winHeight
      break
  }
  
  return { x, y }
}

// Tạo một window instance cho một GIF
function createGifWindow(instance) {
  const winWidth = 200
  const winHeight = 200
  const { x, y } = calculatePosition(instance.position, winWidth, winHeight, instance.customX, instance.customY)
  
  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    movable: true,
    skipTaskbar: true, // Ẩn khỏi taskbar
    type: 'toolbar', // Quan trọng: type toolbar giúp đè lên taskbar trên Windows
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev, // Chỉ bật DevTools trong development
    },
  })
  
  // Hàm force window lên trên cùng
  const forceOnTop = () => {
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(false)
      win.setAlwaysOnTop(true, 'screen-saver', 1)
    }
  }
  
  // Đặt window level cao nhất ngay từ đầu
  forceOnTop()
  
  // Event-based: Set lại khi có thay đổi focus
  win.on('blur', () => {
    setTimeout(forceOnTop, 50)
  })
  
  win.on('focus', forceOnTop)
  win.on('show', forceOnTop)
  
  // Interval nhẹ: chỉ chạy mỗi 2 giây thay vì 500ms để tiết kiệm tài nguyên
  // Vẫn cần interval vì taskbar có thể tự refresh z-order
  const keepOnTopInterval = setInterval(() => {
    forceOnTop()
  }, 2000)
  
  // Dọn dẹp interval khi window đóng
  win.on('closed', () => {
    if (keepOnTopInterval) {
      clearInterval(keepOnTopInterval)
    }
  })
  
  // Lắng nghe sự kiện kéo thả
  win.on('moved', () => {
    // Tìm instance trong config để cập nhật
    const configInstance = config.instances.find(inst => inst.id === instance.id)
    if (configInstance) {
      const [newX, newY] = win.getPosition()
      console.log(`Window moved: ${instance.id}, position: ${configInstance.position}, x: ${newX}, y: ${newY}`)
      
      if (configInstance.position === 'custom') {
        configInstance.customX = newX
        configInstance.customY = newY
        instance.customX = newX
        instance.customY = newY
        saveConfig(config)
        console.log('Custom position saved!')
      }
    }
  })
  
  win.loadFile('index.html')
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('set-gif', instance.gifPath)
    win.webContents.send('position-mode', instance.position)
    const dragMode = instance.dragMode || false
    console.log(`Sending drag-mode to ${instance.id}: ${dragMode}`)
    win.webContents.send('drag-mode', dragMode)
    win.webContents.send('instance-id', instance.id)
  })
  
  // Apply click-through
  const clickThrough = instance.clickThrough || false
  win.setIgnoreMouseEvents(clickThrough, { forward: true })
  console.log(`Window ${instance.id} created with click-through: ${clickThrough}`)
  
  return win
}

app.on('ready', () => {
  // Áp dụng auto start setting
  if (config.autoStart) {
    autoLauncher.enable()
  }
  
  // Tạo tất cả các GIF windows từ config
  config.instances.forEach(instance => {
    windows[instance.id] = createGifWindow(instance)
  })

  // Tạo system tray icon từ logo.png
  const iconPath = path.join(__dirname, 'logo.png')
  let trayIcon = nativeImage.createFromPath(iconPath)
  
  // Resize về 16x16 cho tray
  if (!trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
  }
  
  tray = new Tray(trayIcon)
  console.log('Tray icon created')
    
    function updateTrayMenu() {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Manage Instances',
          click: () => openSettings()
        },
        {
          label: 'Help Guide',
          click: () => openHelp()
        },
        {
          type: 'separator'
        },
        {
          label: 'Start with Windows',
          type: 'checkbox',
          checked: config.autoStart || false,
          click: async (menuItem) => {
            config.autoStart = menuItem.checked
            saveConfig(config)
            if (menuItem.checked) {
              await autoLauncher.enable()
            } else {
              await autoLauncher.disable()
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
      tray.setToolTip('Desktop Animation - ' + config.instances.length + ' instance(s)')
      tray.setContextMenu(contextMenu)
    }
    
  updateTrayMenu()
  tray.on('double-click', () => openSettings())
  
  // Auto-open settings menu only if NOT launched with auto-start
  // Check if app was started with --hidden flag or via auto-launch
  const isAutoLaunched = app.getLoginItemSettings().wasOpenedAtLogin || 
                         process.argv.includes('--hidden') ||
                         app.commandLine.hasSwitch('hidden')
  
  if (!isAutoLaunched) {
    setTimeout(() => {
      openSettings()
    }, 500)
  }

  // Intelli-Hide: Xử lý sự kiện chuột (theo instance)
  let mouseCheckIntervals = {}
  
  ipcMain.on('mouse-entered', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    
    const instanceId = Object.keys(windows).find(id => windows[id] === win)
    if (!instanceId) return
    
    // Khi chuột vào, bắt đầu kiểm tra vị trí chuột
    if (mouseCheckIntervals[instanceId]) clearInterval(mouseCheckIntervals[instanceId])
    
    mouseCheckIntervals[instanceId] = setInterval(() => {
      const mousePos = screen.getCursorScreenPoint()
      const winBounds = win.getBounds()
      
      // Kiểm tra xem chuột có còn trong vùng window không
      const isMouseInside = 
        mousePos.x >= winBounds.x &&
        mousePos.x <= winBounds.x + winBounds.width &&
        mousePos.y >= winBounds.y &&
        mousePos.y <= winBounds.y + winBounds.height
      
      if (!isMouseInside) {
        // Chuột đã rời khỏi → dừng kiểm tra và hiện lại
        clearInterval(mouseCheckIntervals[instanceId])
        delete mouseCheckIntervals[instanceId]
        win.webContents.send('show-character')
      }
    }, 50)
  })
  
  ipcMain.on('mouse-left', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    
    const instanceId = Object.keys(windows).find(id => windows[id] === win)
    if (!instanceId) return
    
    // Dọn dẹp interval nếu có
    if (mouseCheckIntervals[instanceId]) {
      clearInterval(mouseCheckIntervals[instanceId])
      delete mouseCheckIntervals[instanceId]
    }
  })
  
  // Xử lý kéo thả - bật/tắt click-through
  ipcMain.on('enable-dragging', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      // Tắt click-through khi đang kéo
      win.setIgnoreMouseEvents(false)
      console.log('Dragging enabled - click-through disabled')
    }
  })
  
  ipcMain.on('disable-dragging', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    
    const instanceId = Object.keys(windows).find(id => windows[id] === win)
    if (!instanceId) return
    
    const instance = config.instances.find(inst => inst.id === instanceId)
    if (instance) {
      // Khôi phục click-through setting của instance
      win.setIgnoreMouseEvents(instance.clickThrough || false, { forward: true })
      console.log(`Dragging disabled - click-through restored: ${instance.clickThrough}`)
    }
  })
  
})

// Mở cửa sổ settings
function openSettings() {
  if (settingsWin) {
    settingsWin.focus()
    return
  }
  
  settingsWin = new BrowserWindow({
    width: 600,
    height: 500,
    resizable: true,
    title: 'Animio - Manage GIF Instances',
    icon: path.join(__dirname, 'logo.png'), // App icon
    autoHideMenuBar: true, // Ẩn menu bar
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev, // Chỉ bật DevTools trong development
    },
  })
  
  settingsWin.loadFile('settings.html')
  
  // Khi settings mở, enable drag mode cho tất cả windows
  settingsWin.on('ready-to-show', () => {
    Object.values(windows).forEach(win => {
      win.webContents.send('settings-opened', true)
    })
  })
  
  // Khi settings đóng, disable drag mode
  settingsWin.on('closed', () => {
    Object.values(windows).forEach(win => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings-opened', false)
      }
    })
    settingsWin = null
  })
}

// Mở cửa sổ help
function openHelp() {
  if (helpWin) {
    helpWin.focus()
    return
  }
  
  helpWin = new BrowserWindow({
    width: 900,
    height: 700,
    resizable: true,
    title: 'Animio - Usage Guide',
    icon: path.join(__dirname, 'logo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev,
    },
  })
  
  helpWin.loadFile('help.html')
  
  helpWin.on('closed', () => {
    helpWin = null
  })
}

// IPC handlers cho settings
ipcMain.handle('get-instances', () => {
  return config.instances
})

ipcMain.handle('get-default-gif-path', () => {
  return path.join(__dirname, 'default.gif')
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

// Thêm instance mới
ipcMain.on('add-instance', (event, instance) => {
  config.instances.push(instance)
  saveConfig(config)
  windows[instance.id] = createGifWindow(instance)
})

// Xóa instance
ipcMain.on('remove-instance', (event, instanceId) => {
  const index = config.instances.findIndex(inst => inst.id === instanceId)
  if (index !== -1) {
    config.instances.splice(index, 1)
    saveConfig(config)
    
    if (windows[instanceId]) {
      windows[instanceId].close()
      delete windows[instanceId]
    }
  }
})

// Cập nhật instance
ipcMain.on('update-instance', (event, instanceId, updates) => {
  const instance = config.instances.find(inst => inst.id === instanceId)
  if (instance) {
    Object.assign(instance, updates)
    saveConfig(config)
    
    const win = windows[instanceId]
    if (win) {
      win.webContents.send('set-gif', instance.gifPath)
      win.webContents.send('position-mode', instance.position)
      win.webContents.send('drag-mode', instance.dragMode || false)
      win.setIgnoreMouseEvents(instance.clickThrough, { forward: true })
      
      if (instance.position !== 'custom') {
        const bounds = win.getBounds()
        const { x, y } = calculatePosition(instance.position, bounds.width, bounds.height, instance.customX, instance.customY)
        win.setPosition(x, y)
      }
    }
  }
})

// Mở help window
ipcMain.on('open-help', () => {
  openHelp()
})
