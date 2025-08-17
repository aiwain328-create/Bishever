import * as AuthSession from 'expo-auth-session';
import * as FileSystem from 'expo-file-system';

const CLIENT_ID = '<ANDROID_OAUTH_CLIENT_ID>'; // set from env or config

export async function signInWithGoogle() {
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
  const scopes = ['https://www.googleapis.com/auth/drive.file'];
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes.join(' '))}`;
  const result = await AuthSession.startAsync({ authUrl });
  if (result.type === 'success') return result.params.access_token;
  throw new Error('Auth failed');
}

export async function uploadFileToDrive(accessToken, localUri, fileName, mimeType) {
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  const fileB64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const metadata = { name: fileName, mimeType };
  const boundary = '-------314159265358979323846';
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileB64}\r\n--${boundary}--`;
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method:'POST', headers:{ Authorization:`Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
  return res.json();
}
