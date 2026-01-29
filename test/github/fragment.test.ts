/**
 * Tests for GitHub fragment types and type guards.
 */

import { describe, expect, it } from "vitest";
import {
  GitHubRepository,
  isGitHubRepository,
  GitHubClone,
  isGitHubClone,
} from "../../src/github/index.ts";
import { stringify } from "../../src/util/render-template.ts";

describe("GitHub Fragments", () => {
  describe("GitHubRepository", () => {
    class TestRepo extends GitHubRepository("test-repo", {
      owner: "sam-goodwin",
      repo: "alchemy",
    })`
# Alchemy Repository

Infrastructure as Code framework for TypeScript.
` {}

    it("creates a fragment with correct type", () => {
      expect(TestRepo.type).toBe("github-repository");
      expect(TestRepo.id).toBe("test-repo");
    });

    it("stores owner and repo props", () => {
      expect((TestRepo as any).owner).toBe("sam-goodwin");
      expect((TestRepo as any).repo).toBe("alchemy");
    });

    it("isGitHubRepository type guard works", () => {
      expect(isGitHubRepository(TestRepo)).toBe(true);
      expect(isGitHubRepository({})).toBe(false);
      expect(isGitHubRepository(null)).toBe(false);
    });

    it("serializes to correct format", () => {
      const serialized = stringify(TestRepo);
      expect(serialized).toBe("📦sam-goodwin/alchemy");
    });
  });

  describe("GitHubClone", () => {
    class LocalRepo extends GitHubClone("local", {
      path: "/Users/sam/projects/alchemy",
    })`
# Local Clone
` {}

    it("creates a fragment with correct type", () => {
      expect(LocalRepo.type).toBe("github-clone");
      expect(LocalRepo.id).toBe("local");
    });

    it("isGitHubClone type guard works", () => {
      expect(isGitHubClone(LocalRepo)).toBe(true);
      expect(isGitHubClone({})).toBe(false);
    });

    it("serializes correctly", () => {
      const serialized = stringify(LocalRepo);
      expect(serialized).toBe("📂/Users/sam/projects/alchemy");
    });
  });

  describe("Fragment Discovery", () => {
    it("fragments are distinguishable from each other", () => {
      class Repo extends GitHubRepository("r", { owner: "o", repo: "r" })`` {}
      class Clone extends GitHubClone("c", { path: "/tmp" })`` {}

      // Each type guard only matches its own type
      expect(isGitHubRepository(Repo)).toBe(true);
      expect(isGitHubRepository(Clone)).toBe(false);

      expect(isGitHubClone(Clone)).toBe(true);
      expect(isGitHubClone(Repo)).toBe(false);
    });
  });
});
