import { app, BrowserWindow, shell, ipcMain } from 'electron'
import * as path from 'path'
import * as URL from 'url'

let mainWindow: BrowserWindow | null = null

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit()
})

function getElectronPath () {
  // Find the shortest path to the electron binary
  const absoluteElectronPath = process.execPath
  const relativeElectronPath = path.relative(process.cwd(), absoluteElectronPath)
  return absoluteElectronPath.length < relativeElectronPath.length
    ? absoluteElectronPath
    : relativeElectronPath
}

function decorateURL (url: string) {
  // safely add `?utm_source=default_app
  const parsedUrl = URL.parse(url, true)
  parsedUrl.query = { ...parsedUrl.query, utm_source: 'default_app' }
  return URL.format(parsedUrl)
}

const indexPath = path.resolve(app.getAppPath(), 'index.html')

function isTrustedSender (webContents: Electron.WebContents) {
  if (webContents !== (mainWindow && mainWindow.webContents)) {
    return false
  }

  const parsedUrl = URL.parse(webContents.getURL())
  return parsedUrl.protocol === 'file:' && parsedUrl.pathname === indexPath
}

ipcMain.on('get-electron-path', (event) => {
  try {
    event.returnValue = getElectronPath()
  } catch {
    event.returnValue = null
  }
})

ipcMain.on('open-link-externally', (event, url) => {
  if (isTrustedSender(event.sender)) {
    shell.openExternal(decorateURL(url))
  }
})

async function createWindow () {
  await app.whenReady()

  const options: Electron.BrowserWindowConstructorOptions = {
    width: 900,
    height: 600,
    autoHideMenuBar: true,
    backgroundColor: '#FFFFFF',
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(__dirname, 'renderer.js'),
      sandbox: true,
      enableRemoteModule: false
    },
    useContentSize: true,
    show: false
  }

  if (process.platform === 'linux') {
    options.icon = path.join(__dirname, 'icon.png')
  }

  mainWindow = new BrowserWindow(options)
  mainWindow.on('ready-to-show', () => mainWindow!.show())

  return mainWindow
}

export const loadURL = async (appUrl: string) => {
  mainWindow = await createWindow()
  mainWindow.loadURL(appUrl)
  mainWindow.focus()
}

export const loadFile = async (appPath: string) => {
  mainWindow = await createWindow()
  mainWindow.loadFile(appPath)
  mainWindow.focus()
}
