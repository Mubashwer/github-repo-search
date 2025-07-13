import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AuthService } from "../auth";

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = AuthService.getInstance();
    jest.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("getAuthHeaders", () => {
    it("should return basic headers structure", async () => {
      const headers = await authService.getAuthHeaders();
      expect(headers).toHaveProperty("Accept");
      expect(headers.Accept).toBe("application/vnd.github.v3+json");
    });
  });
});
