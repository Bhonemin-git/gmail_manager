import { CONFIG } from '../config';
import { GmailUser } from '../types/gmail';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gmail_access_token',
  USER_INFO: 'gmail_user_info'
};

export class GmailAuthService {
  static initiateLogin(): void {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', CONFIG.GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', CONFIG.REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', CONFIG.SCOPES);

    window.location.href = authUrl.toString();
  }

  static handleCallback(): string | null {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');

    if (accessToken) {
      this.setAccessToken(accessToken);
      window.history.replaceState(null, '', window.location.pathname);
    }

    return accessToken;
  }

  static setAccessToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  static setUserInfo(user: GmailUser): void {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
  }

  static getUserInfo(): GmailUser | null {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    return userInfo ? JSON.parse(userInfo) : null;
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  static async fetchUserInfo(accessToken: string): Promise<GmailUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  }
}
