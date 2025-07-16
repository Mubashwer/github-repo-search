import { AuthService } from "../services/auth";
import type {
  RuntimeMessage,
  RuntimeResponse,
  GitHubSearchResponse,
} from "../types";

// Initialize auth service
const authService = AuthService.getInstance();

// Handle service worker suspension/resumption
chrome.runtime.onSuspend.addListener(() => {
  console.log("Service worker suspending");
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log("Service worker suspension canceled");
});

// Background script for handling search requests
chrome.runtime.onMessage.addListener(
  (
    request: RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: RuntimeResponse) => void,
  ) => {
    if (request.action === "search-repos") {
      searchGitHubRepos(request.query, request.org)
        .then((repos) => sendResponse({ repos }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // Keep the message channel open for async response
    }

    if (request.action === "authenticate") {
      authService
        .authenticate()
        .then((authState) => sendResponse({ success: true, authState }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message }),
        );
      return true;
    }

    if (request.action === "get-auth-state") {
      authService
        .getAuthState()
        .then((authState) => {
          sendResponse({ success: true, authState });
        })
        .catch((error) => {
          console.error("Failed to get auth state:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === "auth-token") {
      // Handle authentication token from auth page
      const authState = {
        isAuthenticated: true,
        token: request.token,
      };

      chrome.storage.local
        .set({ github_auth_state: authState })
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      return true;
    }
  },
);

async function searchGitHubRepos(query: string, org?: string) {
  if (!query.trim()) {
    return [];
  }

  try {
    const headers = await authService.getAuthHeaders();

    // Build search query with optional organization filter
    let searchQuery = query;
    if (org && org.trim()) {
      searchQuery = `org:${org.trim()} ${query}`;
    }

    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&per_page=10`,
      {
        headers,
      },
    );

    if (!response.ok) {
      if (response.status === 403) {
        // Check if it's a rate limit error
        const rateLimitRemaining = response.headers.get(
          "X-RateLimit-Remaining",
        );
        const rateLimitReset = response.headers.get("X-RateLimit-Reset");
        const resetTime = rateLimitReset
          ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString()
          : "unknown";

        const authState = await authService.getAuthState();

        console.log("Rate limit info:", {
          remaining: rateLimitRemaining,
          reset: resetTime,
          isAuthenticated: authState.isAuthenticated,
        });

        if (rateLimitRemaining === "0") {
          if (!authState.isAuthenticated) {
            throw new Error(
              `Rate limit exceeded. Please authenticate with GitHub for higher limits (5000/hour vs 60/hour). Rate limit resets at ${resetTime}.`,
            );
          } else {
            throw new Error(
              `Rate limit exceeded. Please try again at ${resetTime}.`,
            );
          }
        } else {
          throw new Error(
            `GitHub API error: ${response.status} - ${response.statusText}`,
          );
        }
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data: GitHubSearchResponse = await response.json();
    return data.items.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      language: repo.language,
      url: repo.html_url,
      owner: {
        login: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
    }));
  } catch (error) {
    console.error("Error searching GitHub repos:", error);
    throw error;
  }
}
