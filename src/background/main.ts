import { AuthService } from '../services/auth'

// Initialize auth service
const authService = AuthService.getInstance()

// Initialize when extension starts
chrome.runtime.onStartup.addListener(async () => {
  await authService.initialize()
})

chrome.runtime.onInstalled.addListener(async () => {
  await authService.initialize()
})

// Background script for handling search requests
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (request.action === 'search-repos') {
    searchGitHubRepos(request.query, request.org)
      .then(repos => sendResponse({ repos }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'authenticate') {
    authService.authenticate()
      .then(authState => sendResponse({ success: true, authState }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'get-auth-state') {
    sendResponse({ success: true, authState: authService.getAuthState() });
    return true;
  }
});

async function searchGitHubRepos(query: string, org?: string) {
  if (!query.trim()) {
    return [];
  }

  try {
    const headers = authService.getAuthHeaders()
    
    // Build search query with optional organization filter
    let searchQuery = query
    if (org && org.trim()) {
      searchQuery = `${query} org:${org.trim()}`
    }
    
    const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=10`, {
      headers
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        // Rate limit exceeded - trigger authentication
        const rateLimitReset = response.headers.get('X-RateLimit-Reset')
        const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString() : 'unknown'
        
        if (!authService.getAuthState().isAuthenticated) {
          throw new Error(`Rate limit exceeded. Please authenticate with GitHub to continue. Rate limit resets at ${resetTime}.`)
        } else {
          throw new Error(`Rate limit exceeded. Please try again at ${resetTime}.`)
        }
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.items.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      language: repo.language,
      url: repo.html_url,
      owner: {
        login: repo.owner.login,
        avatarUrl: repo.owner.avatar_url
      }
    }));
  } catch (error) {
    console.error('Error searching GitHub repos:', error);
    throw error;
  }
}
