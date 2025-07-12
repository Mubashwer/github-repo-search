interface SearchOverlayState {
  isVisible: boolean;
  searchTerm: string;
  results: GitHubRepo[];
  selectedIndex: number;
  isLoading: boolean;
}

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
}

class GitHubSearchOverlay {
  private overlay: HTMLDivElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private resultsContainer: HTMLDivElement | null = null;
  private state: SearchOverlayState = {
    isVisible: false,
    searchTerm: '',
    results: [],
    selectedIndex: -1,
    isLoading: false
  };

  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    
    chrome.runtime.onMessage.addListener(this.handleMessage);
    document.addEventListener('keydown', this.handleDocumentKeydown);
  }

  private handleMessage(request: any, _sender: chrome.runtime.MessageSender, _sendResponse: (response: any) => void) {
    if (request.action === 'toggle-search') {
      this.toggle();
    }
  }

  private handleDocumentKeydown(event: KeyboardEvent) {
    // Handle Escape key to close overlay
    if (event.key === 'Escape' && this.state.isVisible) {
      this.hide();
      event.preventDefault();
    }
  }

  private toggle() {
    if (this.state.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private show() {
    if (!this.overlay) {
      this.createOverlay();
    }
    
    this.state.isVisible = true;
    this.overlay!.style.display = 'flex';
    this.searchInput!.focus();
    this.searchInput!.select();
  }

  private hide() {
    if (this.overlay) {
      this.state.isVisible = false;
      this.overlay.style.display = 'none';
      this.state.searchTerm = '';
      this.state.results = [];
      this.state.selectedIndex = -1;
      this.searchInput!.value = '';
      this.renderResults();
    }
  }

  private createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      justify-content: center;
      align-items: flex-start;
      padding-top: 10vh;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search GitHub repositories...';
    this.searchInput.style.cssText = `
      border: none;
      outline: none;
      padding: 20px;
      font-size: 18px;
      border-bottom: 1px solid #e1e4e8;
      background: transparent;
    `;

    // Results container
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.style.cssText = `
      overflow-y: auto;
      max-height: 400px;
    `;

    container.appendChild(this.searchInput);
    container.appendChild(this.resultsContainer);
    this.overlay.appendChild(container);

    // Event listeners
    this.searchInput.addEventListener('input', this.handleSearch.bind(this));
    this.searchInput.addEventListener('keydown', this.handleKeydown);
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    document.body.appendChild(this.overlay);
  }

  private handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.state.selectedIndex = Math.min(this.state.selectedIndex + 1, this.state.results.length - 1);
        this.renderResults();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, -1);
        this.renderResults();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.state.selectedIndex >= 0 && this.state.results[this.state.selectedIndex]) {
          this.openRepository(this.state.results[this.state.selectedIndex]);
        }
        break;
    }
  }

  private async handleSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value.trim();
    this.state.searchTerm = query;

    if (!query) {
      this.state.results = [];
      this.state.selectedIndex = -1;
      this.renderResults();
      return;
    }

    this.state.isLoading = true;
    this.renderLoading();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'search-repos',
        query: query
      });

      if (response.error) {
        throw new Error(response.error);
      }

      this.state.results = response.repos || [];
      this.state.selectedIndex = this.state.results.length > 0 ? 0 : -1;
      this.state.isLoading = false;
      this.renderResults();
    } catch (error) {
      console.error('Error searching repos:', error);
      this.state.isLoading = false;
      this.renderError();
    }
  }

  private renderLoading() {
    if (!this.resultsContainer) return;
    
    this.resultsContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #666;">
        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #e1e4e8; border-radius: 50%; border-top-color: #0366d6; animation: spin 1s linear infinite;"></div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
        <div style="margin-top: 10px;">Searching repositories...</div>
      </div>
    `;
  }

  private renderError() {
    if (!this.resultsContainer) return;
    
    this.resultsContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #d73a49;">
        <div style="margin-bottom: 10px;">⚠️</div>
        <div>Error searching repositories. Please try again.</div>
      </div>
    `;
  }

  private renderResults() {
    if (!this.resultsContainer) return;

    if (this.state.results.length === 0) {
      this.resultsContainer.innerHTML = this.state.searchTerm 
        ? '<div style="padding: 20px; text-align: center; color: #666;">No repositories found</div>'
        : '';
      return;
    }

    this.resultsContainer.innerHTML = this.state.results
      .map((repo, index) => {
        const isSelected = index === this.state.selectedIndex;
        return `
          <div 
            class="repo-item" 
            data-index="${index}"
            style="
              padding: 16px 20px;
              border-bottom: 1px solid #e1e4e8;
              cursor: pointer;
              background: ${isSelected ? '#f6f8fa' : 'white'};
              display: flex;
              align-items: center;
              gap: 12px;
            "
          >
            <img 
              src="${repo.owner.avatarUrl}" 
              alt="${repo.owner.login}"
              style="width: 32px; height: 32px; border-radius: 50%;"
            />
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 600; color: #0366d6; margin-bottom: 4px;">
                ${repo.fullName}
              </div>
              <div style="color: #666; font-size: 14px; line-height: 1.4; margin-bottom: 4px;">
                ${repo.description || 'No description available'}
              </div>
              <div style="display: flex; align-items: center; gap: 16px; font-size: 12px; color: #666;">
                ${repo.language ? `<span>📝 ${repo.language}</span>` : ''}
                <span>⭐ ${repo.stars.toLocaleString()}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    // Add click listeners to repo items
    this.resultsContainer.querySelectorAll('.repo-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.openRepository(this.state.results[index]);
      });
      
      item.addEventListener('mouseenter', () => {
        this.state.selectedIndex = index;
        this.renderResults();
      });
    });
  }

  private openRepository(repo: GitHubRepo) {
    window.open(repo.url, '_blank');
    this.hide();
  }
}

// Initialize the overlay when the content script loads
new GitHubSearchOverlay();
