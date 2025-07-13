import { AuthService } from '../services/auth'

// Initialize auth service
const authService = AuthService.getInstance()

// Initialize when extension starts
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension startup - initializing auth service');
  await authService.initialize()
})

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed - initializing auth service');
  await authService.initialize()
})

// Handle service worker suspension/resumption
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending');
})

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('Service worker suspension canceled');
})

// Background script for handling search requests
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (request.action === 'search-repos') {
    // Always ensure auth service is initialized before searching
    authService.initialize()
      .then(() => searchGitHubRepos(request.query, request.org))
      .then(repos => sendResponse({ repos }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'authenticate') {
    // Ensure auth service is initialized before authenticating
    authService.initialize()
      .then(() => authService.authenticate())
      .then(authState => sendResponse({ success: true, authState }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'get-auth-state') {
    // Always ensure auth service is initialized before returning state
    authService.initialize()
      .then(() => {
        sendResponse({ success: true, authState: authService.getAuthState() });
      })
      .catch(error => {
        console.error('Failed to initialize auth service:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (request.action === 'auth-token') {
    // Handle authentication token from auth page
    chrome.storage.local.set({ 'github-token': request.token })
      .then(() => authService.initialize()) // Re-initialize to load the new token
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }));
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
        // Check if it's a rate limit error
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining')
        const rateLimitReset = response.headers.get('X-RateLimit-Reset')
        const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString() : 'unknown'
        
        console.log('Rate limit info:', {
          remaining: rateLimitRemaining,
          reset: resetTime,
          isAuthenticated: authService.getAuthState().isAuthenticated
        })
        
        if (rateLimitRemaining === '0') {
          if (!authService.getAuthState().isAuthenticated) {
            throw new Error(`Rate limit exceeded. Please authenticate with GitHub for higher limits (5000/hour vs 60/hour). Rate limit resets at ${resetTime}.`)
          } else {
            throw new Error(`Rate limit exceeded. Please try again at ${resetTime}.`)
          }
        } else {
          throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`)
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
