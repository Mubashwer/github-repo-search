import type { AuthState, AuthTokenMessage } from "../types";

export class AuthService {
  private static instance: AuthService;
  private static readonly STORAGE_KEY = "github_auth_state";

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async authenticate(): Promise<AuthState> {
    try {
      // Create a new tab with authentication instructions
      const authTab = await chrome.tabs.create({
        url: chrome.runtime.getURL("src/auth/index.html"),
        active: true,
      });

      // Wait for the user to provide the token
      const token = await this.waitForToken(authTab.id!);

      if (token) {
        // Validate token by testing search endpoint
        await this.validateToken(token);

        const authState: AuthState = {
          isAuthenticated: true,
          token: token,
        };

        // Store auth state
        await chrome.storage.local.set({
          [AuthService.STORAGE_KEY]: authState,
        });

        return authState;
      }

      return { isAuthenticated: false };
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
  }

  private async waitForToken(tabId: number): Promise<string | null> {
    return new Promise((resolve) => {
      const listener = (
        message: AuthTokenMessage,
        sender: chrome.runtime.MessageSender,
      ) => {
        if (sender.tab?.id === tabId && message.action === "auth-token") {
          chrome.runtime.onMessage.removeListener(listener);
          chrome.tabs.remove(tabId);
          resolve(message.token);
        }
      };

      chrome.runtime.onMessage.addListener(listener);

      // Timeout after 5 minutes
      setTimeout(
        () => {
          chrome.runtime.onMessage.removeListener(listener);
          resolve(null);
        },
        5 * 60 * 1000,
      );
    });
  }

  private async validateToken(token?: string): Promise<void> {
    let tokenToValidate = token;

    if (!tokenToValidate) {
      const authState = await this.getAuthState();
      tokenToValidate = authState.token;
    }

    if (!tokenToValidate) return;

    const response = await fetch(
      "https://api.github.com/search/repositories?q=test&per_page=1",
      {
        headers: {
          Authorization: `token ${tokenToValidate}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
  }

  async getAuthState(): Promise<AuthState> {
    const result = await chrome.storage.local.get([AuthService.STORAGE_KEY]);
    return result[AuthService.STORAGE_KEY] || { isAuthenticated: false };
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };

    const authState = await this.getAuthState();
    if (authState.isAuthenticated && authState.token) {
      headers["Authorization"] = `token ${authState.token}`;
    }

    return headers;
  }
}
