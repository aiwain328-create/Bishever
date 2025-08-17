const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { google } = require('googleapis');
const keytar = require('keytar');
const fs = require('fs');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '<YOUR_CLIENT_ID>';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '<YOUR_CLIENT_SECRET>';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

let win;
function createWindow() {
  win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'web', 'build', 'index.html'));
  }
}
app.whenReady().then(createWindow);

ipcMain.handle('drive:getAuthUrl', async () => {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/drive.file'], prompt: 'consent' });
  return url;
});

ipcMain.handle('drive:exchangeCode', async (event, code) => {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  const { tokens } = await oauth2Client.getToken(code);
  await keytar.setPassword('nimbus-notes', 'google-drive-tokens', JSON.stringify(tokens));
  return tokens;
});

ipcMain.handle('drive:uploadFile', async (event, { localPath, mimeType, fileName }) => {
  const t = await keytar.getPassword('nimbus-notes', 'google-drive-tokens');
  if (!t) throw new Error('Not authenticated');
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oauth2Client.setCredentials(JSON.parse(t));
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const res = await drive.files.create({ requestBody: { name: fileName }, media: { mimeType, body: fs.createReadStream(localPath) }, fields: 'id,webViewLink,webContentLink' });
  return res.data;
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
