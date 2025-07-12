export interface GitHubRepo {
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

export interface SearchOverlayState {
  isVisible: boolean;
  searchTerm: string;
  results: GitHubRepo[];
  selectedIndex: number;
  isLoading: boolean;
  error: string | null;
}

export interface SearchMessage {
  action: 'search-repos';
  query: string;
}

export interface SearchResponse {
  repos?: GitHubRepo[];
  error?: string;
}

export interface ToggleMessage {
  action: 'toggle-search';
}

export interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  user?: {
    login: string;
    name: string;
    avatar_url: string;
  };
}

export interface AuthMessage {
  action: 'authenticate' | 'logout' | 'get-auth-state';
}

export interface AuthResponse {
  success: boolean;
  authState?: AuthState;
  error?: string;
}
