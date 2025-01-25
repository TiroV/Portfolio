const { app, BrowserWindow } = require('electron');
const path = require('path');
const { globalShortcut } = require('electron');




let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    fullscreen: false, // Launch in fullscreen
    maximizable: true, // Allow maximizing
    autoHideMenuBar: true, // Hide the menu bar
    width: 900, // Default width when not fullscreen
    height: 750, // Default height when not fullscreen
    minWidth: 900, // Minimum width when resizing
     minHeight: 750, // Minimum height when resizing
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional, if you have a preload script
      contextIsolation: true, // Isolate preload script from renderer
      nodeIntegration: false, // Prevent direct Node.js access
    },
  });
mainWindow.maximize(); // Start maximized

  const { globalShortcut } = require('electron');

  app.on('ready', () => {
    globalShortcut.register('F11', () => {
      const isFullscreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullscreen);
    });
  });

  mainWindow.loadFile('OverWhelm index.html'); // Load your game's HTML file
});


// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
