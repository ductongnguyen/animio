const { app, BrowserWindow, screen, ipcMain } = require('electron')

// Tắt cache warnings
app.commandLine.appendSwitch('disable-http-cache')

app.on('ready', () => {
  // Kích thước cửa sổ nhân vật
  const winWidth = 200
  const winHeight = 200

  // Lấy vùng làm việc (workArea) – phần màn hình trừ taskbar
  const { workArea } = screen.getPrimaryDisplay()

  // Tính vị trí: sát cạnh phải, chạm mép trên của taskbar
  const x = workArea.x + workArea.width - winWidth
  const y = workArea.y + workArea.height - winHeight

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // Intelli-Hide: Xử lý sự kiện chuột
  let mouseCheckInterval = null
  
  ipcMain.on('mouse-entered', () => {
    // Khi chuột vào, bắt đầu kiểm tra vị trí chuột
    if (mouseCheckInterval) clearInterval(mouseCheckInterval)
    
    mouseCheckInterval = setInterval(() => {
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
        clearInterval(mouseCheckInterval)
        mouseCheckInterval = null
        win.webContents.send('show-character')
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

  win.loadFile('index.html')
})
