import { describe, it, expect } from "@jest/globals";
import type { GitHubRepo, SearchOverlayState, AuthState } from "../types";

describe("Types", () => {
  describe("GitHubRepo", () => {
    it("should have required properties", () => {
      const repo: GitHubRepo = {
        id: 123,
        name: "test-repo",
        fullName: "user/test-repo",
        description: "A test repository",
        stars: 42,
        language: "TypeScript",
        url: "https://github.com/user/test-repo",
        owner: {
          login: "user",
          avatarUrl: "https://avatars.githubusercontent.com/u/123?v=4",
        },
      };

      expect(repo.id).toBe(123);
      expect(repo.name).toBe("test-repo");
      expect(repo.fullName).toBe("user/test-repo");
      expect(repo.description).toBe("A test repository");
      expect(repo.stars).toBe(42);
      expect(repo.language).toBe("TypeScript");
      expect(repo.url).toBe("https://github.com/user/test-repo");
      expect(repo.owner.login).toBe("user");
      expect(repo.owner.avatarUrl).toBe(
        "https://avatars.githubusercontent.com/u/123?v=4",
      );
    });

    it("should allow null values for optional properties", () => {
      const repo: GitHubRepo = {
        id: 123,
        name: "test-repo",
        fullName: "user/test-repo",
        description: null,
        stars: 42,
        language: null,
        url: "https://github.com/user/test-repo",
        owner: {
          login: "user",
          avatarUrl: "https://avatars.githubusercontent.com/u/123?v=4",
        },
      };

      expect(repo.description).toBeNull();
      expect(repo.language).toBeNull();
    });
  });

  describe("SearchOverlayState", () => {
    it("should have default state structure", () => {
      const state: SearchOverlayState = {
        isVisible: false,
        searchTerm: "",
        results: [],
        selectedIndex: 0,
        isLoading: false,
        error: null,
      };

      expect(state.isVisible).toBe(false);
      expect(state.searchTerm).toBe("");
      expect(state.results).toEqual([]);
      expect(state.selectedIndex).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should allow populated state", () => {
      const mockRepo: GitHubRepo = {
        id: 123,
        name: "test-repo",
        fullName: "user/test-repo",
        description: "A test repository",
        stars: 42,
        language: "TypeScript",
        url: "https://github.com/user/test-repo",
        owner: {
          login: "user",
          avatarUrl: "https://avatars.githubusercontent.com/u/123?v=4",
        },
      };

      const state: SearchOverlayState = {
        isVisible: true,
        searchTerm: "react",
        results: [mockRepo],
        selectedIndex: 1,
        isLoading: true,
        error: "An error occurred",
      };

      expect(state.isVisible).toBe(true);
      expect(state.searchTerm).toBe("react");
      expect(state.results).toHaveLength(1);
      expect(state.results[0]).toEqual(mockRepo);
      expect(state.selectedIndex).toBe(1);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe("An error occurred");
    });
  });

  describe("AuthState", () => {
    it("should represent unauthenticated state", () => {
      const state: AuthState = {
        isAuthenticated: false,
      };

      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeUndefined();
    });

    it("should represent authenticated state", () => {
      const state: AuthState = {
        isAuthenticated: true,
        token: "gh_token_123",
      };

      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe("gh_token_123");
    });
  });
});
