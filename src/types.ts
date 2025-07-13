export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  url: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
}

export interface SearchOverlayState {
  isVisible: boolean;
  searchTerm: string;
  results: GitHubRepo[];
  selectedIndex: number;
  isLoading: boolean;
  error: string | null;
}

export interface SearchMessage {
  action: "search-repos";
  query: string;
  org?: string;
}

export interface SearchResponse {
  repos?: GitHubRepo[];
  error?: string;
}

export interface ToggleMessage {
  action: "toggle-search";
}

export interface AuthState {
  isAuthenticated: boolean;
  token?: string;
}

export interface AuthMessage {
  action: "authenticate" | "get-auth-state";
}

export interface AuthTokenMessage {
  action: "auth-token";
  token: string;
}

export interface AuthResponse {
  success: boolean;
  authState?: AuthState;
  error?: string;
}

// GitHub API response interfaces
export interface GitHubApiRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubSearchResponse {
  items: GitHubApiRepo[];
  total_count: number;
  incomplete_results: boolean;
}

// Message types for chrome.runtime.onMessage
export type RuntimeMessage =
  | SearchMessage
  | AuthMessage
  | AuthTokenMessage
  | ToggleMessage;

export interface RuntimeResponse {
  repos?: GitHubRepo[];
  error?: string;
  success?: boolean;
  authState?: AuthState;
}
