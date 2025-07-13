import type { SearchOverlayState } from '../types'

class PopupSearchManager {
  private searchInput: HTMLInputElement
  private orgInput: HTMLInputElement
  private resultsContainer: HTMLDivElement
  private state: SearchOverlayState = {
    isVisible: true,
    searchTerm: '',
    results: [],
    selectedIndex: -1,
    isLoading: false,
    error: null
  }
  private searchTimeout: ReturnType<typeof setTimeout> | null = null
  private orgTimeout: ReturnType<typeof setTimeout> | null = null
  private currentOrg: string = ''

  constructor() {
    this.searchInput = document.getElementById('searchInput') as HTMLInputElement
    this.orgInput = document.getElementById('orgInput') as HTMLInputElement
    this.resultsContainer = document.getElementById('resultsContainer') as HTMLDivElement
    
    this.initializeEventListeners()
    this.loadLastOrganization()
    this.focusSearchInput()
  }

  private initializeEventListeners() {
    this.searchInput.addEventListener('input', this.handleSearchInput.bind(this))
    this.searchInput.addEventListener('keydown', this.handleKeydown.bind(this))
    this.orgInput.addEventListener('input', this.handleOrgInput.bind(this))
    this.orgInput.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  private async loadLastOrganization() {
    try {
      const result = await chrome.storage.local.get(['lastSearchedOrg'])
      if (result.lastSearchedOrg) {
        this.currentOrg = result.lastSearchedOrg
        this.orgInput.value = this.currentOrg
      }
    } catch (error) {
      console.error('Failed to load last organization:', error)
    }
  }

  private async saveLastOrganization(org: string) {
    try {
      await chrome.storage.local.set({ lastSearchedOrg: org })
    } catch (error) {
      console.error('Failed to save last organization:', error)
    }
  }

  private handleOrgInput(event: Event) {
    const org = (event.target as HTMLInputElement).value.trim()
    this.currentOrg = org
    this.saveLastOrganization(org)
    
    // Clear previous org timeout
    if (this.orgTimeout) {
      clearTimeout(this.orgTimeout)
    }
    
    // Debounce org changes to avoid excessive API calls
    if (this.state.searchTerm) {
      this.orgTimeout = setTimeout(() => {
        this.performSearch(this.state.searchTerm)
      }, 300) // Same 300ms delay as search input
    }
  }

  private focusSearchInput() {
    // Focus the search input when popup opens
    setTimeout(() => {
      this.searchInput.focus()
    }, 100)
  }

  private handleSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value.trim()
    this.state.searchTerm = query

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    // Debounce search to avoid too many API calls
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query)
    }, 300)
  }

  private handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.selectNext()
        break
      case 'ArrowUp':
        event.preventDefault()
        this.selectPrevious()
        break
      case 'Enter':
        event.preventDefault()
        this.openSelectedRepo()
        break
      case 'Escape':
        window.close()
        break
    }
  }

  private selectNext() {
    if (this.state.results.length === 0) return
    this.state.selectedIndex = Math.min(this.state.selectedIndex + 1, this.state.results.length - 1)
    this.updateSelectedRepo()
  }

  private selectPrevious() {
    if (this.state.results.length === 0) return
    this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, 0)
    this.updateSelectedRepo()
  }

  private updateSelectedRepo() {
    const repoItems = this.resultsContainer.querySelectorAll('.repo-item')
    repoItems.forEach((item, index) => {
      if (index === this.state.selectedIndex) {
        item.classList.add('selected')
        item.scrollIntoView({ block: 'nearest' })
      } else {
        item.classList.remove('selected')
      }
    })
  }

  private openSelectedRepo() {
    if (this.state.selectedIndex >= 0 && this.state.results[this.state.selectedIndex]) {
      const repo = this.state.results[this.state.selectedIndex]
      chrome.tabs.create({ url: repo.url })
      window.close()
    }
  }

  private async performSearch(query: string) {
    if (!query) {
      this.state.results = []
      this.state.selectedIndex = -1
      this.renderInstructions()
      return
    }

    this.state.isLoading = true
    this.state.error = null
    this.renderLoading()

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'search-repos',
        query: query,
        org: this.currentOrg
      })

      if (response.error) {
        throw new Error(response.error)
      }

      this.state.results = response.repos || []
      this.state.selectedIndex = this.state.results.length > 0 ? 0 : -1
      this.state.isLoading = false
      await this.renderResults()
    } catch (error) {
      console.error('Search error:', error)
      this.state.error = error instanceof Error ? error.message : 'Unknown error'
      this.state.isLoading = false
      this.renderError()
    }
  }

  private renderInstructions() {
    const hasOrg = this.currentOrg && this.currentOrg.trim()
    
    this.resultsContainer.innerHTML = `
      <div class="instructions">
        <p>Start typing to search GitHub repositories</p>
        ${hasOrg ? `
          <p style="font-size: 12px; opacity: 0.8; margin: 8px 0;">
            Searching in organization: <strong>${this.currentOrg}</strong>
          </p>
          <p style="font-size: 11px; opacity: 0.7; margin: 8px 0;">
            Private organizations require authentication
          </p>
        ` : `
          <p style="font-size: 12px; opacity: 0.8; margin: 8px 0;">Add an organization above to filter results</p>
        `}
        <div class="shortcut-info">
          <span class="shortcut-key">Alt+G</span> opens this popup
        </div>
      </div>
    `
  }

  private renderLoading() {
    this.resultsContainer.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <span>Searching repositories...</span>
      </div>
    `
  }

  private renderError() {
    const isRateLimitError = this.state.error?.includes('Rate limit exceeded')
    
    this.resultsContainer.innerHTML = `
      <div class="error">
        <div style="margin-bottom: 10px;">⚠️</div>
        <div>Error: ${this.state.error}</div>
        <div style="margin-top: 8px; font-size: 12px; opacity: 0.7;">
          ${isRateLimitError ? 'Click below to authenticate with GitHub for higher rate limits' : 'Try again or check your internet connection'}
        </div>
        ${isRateLimitError ? '<button class="auth-button" onclick="this.authenticateWithGitHub()">Authenticate with GitHub</button>' : ''}
      </div>
    `
    
    if (isRateLimitError) {
      const authButton = this.resultsContainer.querySelector('.auth-button')
      authButton?.addEventListener('click', this.authenticateWithGitHub.bind(this))
    }
  }

  private async authenticateWithGitHub() {
    try {
      this.renderLoading()
      const response = await chrome.runtime.sendMessage({ action: 'authenticate' })
      
      if (response.success) {
        // Re-run the last search
        if (this.state.searchTerm) {
          await this.performSearch(this.state.searchTerm)
        } else {
          this.renderInstructions()
        }
      } else {
        this.state.error = response.error || 'Authentication failed'
        this.renderError()
      }
    } catch (error) {
      this.state.error = 'Authentication failed'
      this.renderError()
    }
  }

  private async renderResults() {
    if (this.state.results.length === 0) {
      const isOrgSearch = this.currentOrg && this.currentOrg.trim()
      let isAuthenticated = false
      
      if (isOrgSearch) {
        try {
          const response = await chrome.runtime.sendMessage({ action: 'get-auth-state' })
          isAuthenticated = response.authState?.isAuthenticated || false
        } catch (error) {
          console.error('Failed to get auth state:', error)
        }
      }
      
      this.resultsContainer.innerHTML = `
        <div class="no-results">
          <div style="margin-bottom: 16px;">No repositories found for "${this.state.searchTerm}"${isOrgSearch ? ` in organization "${this.currentOrg}"` : ''}</div>
          ${isOrgSearch ? `
            <div style="font-size: 12px; opacity: 0.8; margin-bottom: 12px;">
              ${!isAuthenticated ? 'Private organizations require authentication.' : 'You may not have access to this organization, or it may not exist.'}
            </div>
            ${!isAuthenticated ? '<button class="auth-button">Authenticate with GitHub</button>' : ''}
          ` : ''}
        </div>
      `
      
      if (isOrgSearch && !isAuthenticated) {
        const authButton = this.resultsContainer.querySelector('.auth-button')
        authButton?.addEventListener('click', this.authenticateWithGitHub.bind(this))
      }
      return
    }

    this.resultsContainer.innerHTML = this.state.results
      .map((repo, index) => `
        <div class="repo-item ${index === this.state.selectedIndex ? 'selected' : ''}" data-index="${index}">
          <img class="repo-avatar" src="${repo.owner.avatarUrl}" alt="${repo.owner.login}">
          <div class="repo-info">
            <div class="repo-name">${repo.fullName}</div>
            <div class="repo-description">${repo.description || 'No description available'}</div>
            <div class="repo-meta">
              ${repo.language ? `<span>📝 ${repo.language}</span>` : ''}
              <span>⭐ ${repo.stars.toLocaleString()}</span>
            </div>
          </div>
        </div>
      `)
      .join('')

    // Add click event listeners to repo items
    this.resultsContainer.querySelectorAll('.repo-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.state.selectedIndex = index
        this.openSelectedRepo()
      })
      
      item.addEventListener('mouseenter', () => {
        this.state.selectedIndex = index
        this.updateSelectedRepo()
      })
    })
  }
}

// Initialize the popup search manager when the popup loads
document.addEventListener('DOMContentLoaded', () => {
  new PopupSearchManager()
})
