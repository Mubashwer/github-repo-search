import type { SearchOverlayState } from '../types'

class PopupSearchManager {
  private searchInput: HTMLInputElement
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

  constructor() {
    this.searchInput = document.getElementById('searchInput') as HTMLInputElement
    this.resultsContainer = document.getElementById('resultsContainer') as HTMLDivElement
    
    this.initializeEventListeners()
    this.focusSearchInput()
  }

  private initializeEventListeners() {
    this.searchInput.addEventListener('input', this.handleSearchInput.bind(this))
    this.searchInput.addEventListener('keydown', this.handleKeydown.bind(this))
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
        query: query
      })

      if (response.error) {
        throw new Error(response.error)
      }

      this.state.results = response.repos || []
      this.state.selectedIndex = this.state.results.length > 0 ? 0 : -1
      this.state.isLoading = false
      this.renderResults()
    } catch (error) {
      console.error('Search error:', error)
      this.state.error = error instanceof Error ? error.message : 'Unknown error'
      this.state.isLoading = false
      this.renderError()
    }
  }

  private renderInstructions() {
    this.resultsContainer.innerHTML = `
      <div class="instructions">
        <p>Start typing to search GitHub repositories</p>
        <div class="shortcut-info">
          <span class="shortcut-key">Alt+O</span> opens this popup
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
          this.performSearch(this.state.searchTerm)
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

  private renderResults() {
    if (this.state.results.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="no-results">
          No repositories found for "${this.state.searchTerm}"
        </div>
      `
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
