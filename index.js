const { app, BrowserWindow, screen, ipcMain, dialog, Menu, Tray, nativeImage } = require('electron')
const AutoLaunch = require('auto-launch')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged

app.commandLine.appendSwitch('disable-http-cache')

const configPath = path.join(app.getPath('userData'), 'config.json')

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      console.log('Config loaded from:', configPath)
      console.log('Instances count:', config.instances ? config.instances.length : 0)
      
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

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log('Config saved:', configPath)
  } catch (err) {
    console.error('Error saving config:', err)
  }
}

let config = loadConfig()
let windows = {}
let settingsWin = null
let helpWin = null
let tray = null

const autoLauncher = new AutoLaunch({
  name: 'Animio',
  path: app.getPath('exe'),
  isHidden: true,
})

function calculatePosition(position, winWidth, winHeight, customX = null, customY = null) {
  const display = screen.getPrimaryDisplay()
  const { bounds } = display
  let x, y
  
  switch(position) {
    case 'custom':
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
    skipTaskbar: true,
    type: 'toolbar',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev,
    },
  })
  
  const forceOnTop = () => {
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(false)
      win.setAlwaysOnTop(true, 'screen-saver', 1)
    }
  }
  
  forceOnTop()
  
  win.on('blur', () => {
    setTimeout(forceOnTop, 50)
  })
  
  win.on('focus', forceOnTop)
  win.on('show', forceOnTop)
  
  const keepOnTopInterval = setInterval(() => {
    forceOnTop()
  }, 2000)
  
  win.on('closed', () => {
    if (keepOnTopInterval) {
      clearInterval(keepOnTopInterval)
    }
  })
  
  win.on('moved', () => {
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
  
  const clickThrough = instance.clickThrough || false
  win.setIgnoreMouseEvents(clickThrough, { forward: true })
  console.log(`Window ${instance.id} created with click-through: ${clickThrough}`)
  
  return win
}

app.on('ready', () => {
  if (config.autoStart) {
    autoLauncher.enable()
  }
  
  config.instances.forEach(instance => {
    windows[instance.id] = createGifWindow(instance)
  })

  const iconPath = path.join(__dirname, 'logo.png')
  let trayIcon = nativeImage.createFromPath(iconPath)
  
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
  
  const isAutoLaunched = app.getLoginItemSettings().wasOpenedAtLogin || 
                         process.argv.includes('--hidden') ||
                         app.commandLine.hasSwitch('hidden')
  
  if (!isAutoLaunched) {
    setTimeout(() => {
      openSettings()
    }, 500)
  }

  let mouseCheckIntervals = {}
  
  ipcMain.on('mouse-entered', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    
    const instanceId = Object.keys(windows).find(id => windows[id] === win)
    if (!instanceId) return
    
    if (mouseCheckIntervals[instanceId]) clearInterval(mouseCheckIntervals[instanceId])
    
    mouseCheckIntervals[instanceId] = setInterval(() => {
      const mousePos = screen.getCursorScreenPoint()
      const winBounds = win.getBounds()
      
      const isMouseInside = 
        mousePos.x >= winBounds.x &&
        mousePos.x <= winBounds.x + winBounds.width &&
        mousePos.y >= winBounds.y &&
        mousePos.y <= winBounds.y + winBounds.height
      
      if (!isMouseInside) {
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
    
    if (mouseCheckIntervals[instanceId]) {
      clearInterval(mouseCheckIntervals[instanceId])
      delete mouseCheckIntervals[instanceId]
    }
  })
  
  ipcMain.on('enable-dragging', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
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
      win.setIgnoreMouseEvents(instance.clickThrough || false, { forward: true })
      console.log(`Dragging disabled - click-through restored: ${instance.clickThrough}`)
    }
  })
  
})

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
    icon: path.join(__dirname, 'logo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev,
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
