// Background script for handling keyboard shortcuts and communication
chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'toggle-search') {
    // Get the active tab and inject the search overlay
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-search' });
      }
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (request.action === 'search-repos') {
    searchGitHubRepos(request.query)
      .then(repos => sendResponse({ repos }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

async function searchGitHubRepos(query: string) {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
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
