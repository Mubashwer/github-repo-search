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
      // Only validate token when it's actually used, not on initialization
      // This prevents clearing valid tokens due to temporary network issues
      console.log('Loaded auth state from storage:', this.authState.isAuthenticated ? 'authenticated' : 'not authenticated')
    }
  }

  async authenticate(): Promise<AuthState> {
    try {
      // Create a new tab with authentication instructions
      const authTab = await chrome.tabs.create({
        url: chrome.runtime.getURL('src/auth/index.html'),
        active: true
      })
      
      // Wait for the user to provide the token
      const token = await this.waitForToken(authTab.id!)
      
      if (token) {
        // Validate token by testing search endpoint
        await this.validateToken(token)
        
        this.authState = {
          isAuthenticated: true,
          token: token
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

  private async waitForToken(tabId: number): Promise<string | null> {
    return new Promise((resolve) => {
      const listener = (message: any, sender: chrome.runtime.MessageSender) => {
        if (sender.tab?.id === tabId && message.action === 'auth-token') {
          chrome.runtime.onMessage.removeListener(listener)
          chrome.tabs.remove(tabId)
          resolve(message.token)
        }
      }
      
      chrome.runtime.onMessage.addListener(listener)
      
      // Timeout after 5 minutes
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener)
        resolve(null)
      }, 5 * 60 * 1000)
    })
  }

  private async validateToken(token?: string): Promise<void> {
    const tokenToValidate = token || this.authState.token
    if (!tokenToValidate) return
    
    try {
      const response = await fetch('https://api.github.com/search/repositories?q=test&per_page=1', {
        headers: {
          'Authorization': `token ${tokenToValidate}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }
    } catch (error) {
      // Token is invalid, clear auth state
      this.authState = { isAuthenticated: false }
      await chrome.storage.local.remove(['github_auth_state'])
      throw error
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
