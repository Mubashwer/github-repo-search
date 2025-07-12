class AuthManager {
  private tokenInput: HTMLInputElement
  private authenticateBtn: HTMLButtonElement
  private cancelBtn: HTMLButtonElement
  private messageDiv: HTMLDivElement

  constructor() {
    this.tokenInput = document.getElementById('tokenInput') as HTMLInputElement
    this.authenticateBtn = document.getElementById('authenticateBtn') as HTMLButtonElement
    this.cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement
    this.messageDiv = document.getElementById('message') as HTMLDivElement

    this.initializeEventListeners()
    this.focusTokenInput()
  }

  private initializeEventListeners() {
    this.authenticateBtn.addEventListener('click', this.handleAuthenticate.bind(this))
    this.cancelBtn.addEventListener('click', () => window.close())
    
    // Allow Enter key to authenticate
    this.tokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.authenticateBtn.click()
      }
    })
  }

  private focusTokenInput() {
    // Focus the token input when page loads
    setTimeout(() => {
      this.tokenInput.focus()
    }, 100)
  }

  private async handleAuthenticate() {
    const token = this.tokenInput.value.trim()
    
    if (!token) {
      this.showMessage('Please enter a token', 'error')
      return
    }
    
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      this.showMessage('Invalid token format. GitHub tokens start with "ghp_" or "github_pat_"', 'error')
      return
    }
    
    this.authenticateBtn.disabled = true
    this.authenticateBtn.textContent = 'Authenticating...'
    
    try {
      // Test the token by making a search request
      const response = await fetch('https://api.github.com/search/repositories?q=test&per_page=1', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      
      if (response.ok) {
        this.showMessage('Authentication successful!', 'success')
        
        // Send token to background script
        chrome.runtime.sendMessage({
          action: 'auth-token',
          token: token
        })
        
        setTimeout(() => {
          window.close()
        }, 1000)
      } else {
        this.showMessage('Invalid token. Please check your token and try again.', 'error')
      }
    } catch (error) {
      this.showMessage('Authentication failed. Please check your internet connection and try again.', 'error')
    }
    
    this.authenticateBtn.disabled = false
    this.authenticateBtn.textContent = 'Authenticate'
  }

  private showMessage(text: string, type: 'success' | 'error') {
    this.messageDiv.className = type
    this.messageDiv.textContent = text
  }
}

// Initialize the auth manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new AuthManager()
})
