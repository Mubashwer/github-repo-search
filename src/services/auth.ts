import type { AuthState } from '../types'

export class AuthService {
  private static instance: AuthService
  private authState: AuthState = {
    isAuthenticated: false
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async initialize(): Promise<void> {
    // Load stored auth state
    const result = await chrome.storage.local.get(['github_auth_state'])
    if (result.github_auth_state) {
      this.authState = result.github_auth_state
      // Validate token is still valid
      await this.validateToken()
    }
  }

  async authenticate(): Promise<AuthState> {
    try {
      // GitHub OAuth configuration
      const clientId = 'your_client_id_here' // We'll need to set this up
      const redirectUri = chrome.identity.getRedirectURL()
      const scope = 'repo read:user'
      
      const authUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code`

      // For now, let's use a simpler approach with Personal Access Token
      // In production, you'd implement full OAuth flow
      const token = await this.promptForToken()
      
      if (token) {
        const user = await this.getUserInfo(token)
        this.authState = {
          isAuthenticated: true,
          token: token,
          user: user
        }
        
        // Store auth state
        await chrome.storage.local.set({ github_auth_state: this.authState })
      }
      
      return this.authState
    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    }
  }

  private async promptForToken(): Promise<string | null> {
    return new Promise((resolve) => {
      const token = prompt(`GitHub API Rate Limit Exceeded!

To continue using the extension, you need to provide a GitHub Personal Access Token.

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select these scopes:
   - repo (for private repos, optional)
   - read:user (for user info)
4. Copy the token and paste it here:

Token:`)
      
      resolve(token?.trim() || null)
    })
  }

  private async getUserInfo(token: string): Promise<any> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }
    
    return response.json()
  }

  private async validateToken(): Promise<void> {
    if (!this.authState.token) return
    
    try {
      await this.getUserInfo(this.authState.token)
    } catch (error) {
      // Token is invalid, clear auth state
      this.authState = { isAuthenticated: false }
      await chrome.storage.local.remove(['github_auth_state'])
    }
  }

  async logout(): Promise<void> {
    this.authState = { isAuthenticated: false }
    await chrome.storage.local.remove(['github_auth_state'])
  }

  getAuthState(): AuthState {
    return this.authState
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    }
    
    if (this.authState.isAuthenticated && this.authState.token) {
      headers['Authorization'] = `token ${this.authState.token}`
    }
    
    return headers
  }
}
