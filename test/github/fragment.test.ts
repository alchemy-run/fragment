/**
 * Tests for GitHub fragment types and type guards.
 */

import { describe, expect, it } from "vitest";
import {
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubActions,
  GitHubClone,
  isGitHubRepository,
  isGitHubIssue,
  isGitHubPullRequest,
  isGitHubActions,
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

  describe("GitHubIssue", () => {
    class AllIssues extends GitHubIssue("all-issues", {
      owner: "sam-goodwin",
      repo: "alchemy",
      state: "open",
    })`
# Open Issues

All open issues for the Alchemy project.
` {}

    class SpecificIssue extends GitHubIssue("issue-123", {
      owner: "sam-goodwin",
      repo: "alchemy",
      number: 123,
    })`
# Bug Report #123
` {}

    it("creates a fragment with correct type", () => {
      expect(AllIssues.type).toBe("github-issue");
      expect(AllIssues.id).toBe("all-issues");
    });

    it("stores props correctly", () => {
      expect((AllIssues as any).owner).toBe("sam-goodwin");
      expect((AllIssues as any).repo).toBe("alchemy");
      expect((AllIssues as any).state).toBe("open");
    });

    it("isGitHubIssue type guard works", () => {
      expect(isGitHubIssue(AllIssues)).toBe(true);
      expect(isGitHubIssue(SpecificIssue)).toBe(true);
      expect(isGitHubIssue({})).toBe(false);
    });

    it("serializes issues list correctly", () => {
      const serialized = stringify(AllIssues);
      expect(serialized).toBe("🐛sam-goodwin/alchemy");
    });

    it("serializes specific issue with number", () => {
      const serialized = stringify(SpecificIssue);
      expect(serialized).toBe("🐛sam-goodwin/alchemy#123");
    });
  });

  describe("GitHubPullRequest", () => {
    class AllPRs extends GitHubPullRequest("all-prs", {
      owner: "sam-goodwin",
      repo: "alchemy",
    })`
# Open Pull Requests
` {}

    class SpecificPR extends GitHubPullRequest("pr-456", {
      owner: "sam-goodwin",
      repo: "alchemy",
      number: 456,
    })`
# Feature PR
` {}

    it("creates a fragment with correct type", () => {
      expect(AllPRs.type).toBe("github-pull-request");
      expect(AllPRs.id).toBe("all-prs");
    });

    it("isGitHubPullRequest type guard works", () => {
      expect(isGitHubPullRequest(AllPRs)).toBe(true);
      expect(isGitHubPullRequest(SpecificPR)).toBe(true);
      expect(isGitHubPullRequest({})).toBe(false);
    });

    it("serializes PR list correctly", () => {
      const serialized = stringify(AllPRs);
      expect(serialized).toBe("🔀sam-goodwin/alchemy");
    });

    it("serializes specific PR with number", () => {
      const serialized = stringify(SpecificPR);
      expect(serialized).toBe("🔀sam-goodwin/alchemy#456");
    });
  });

  describe("GitHubActions", () => {
    class CI extends GitHubActions("ci", {
      owner: "sam-goodwin",
      repo: "alchemy",
      limit: 5,
    })`
# CI/CD Status
` {}

    it("creates a fragment with correct type", () => {
      expect(CI.type).toBe("github-actions");
      expect(CI.id).toBe("ci");
    });

    it("isGitHubActions type guard works", () => {
      expect(isGitHubActions(CI)).toBe(true);
      expect(isGitHubActions({})).toBe(false);
    });

    it("serializes correctly", () => {
      const serialized = stringify(CI);
      expect(serialized).toBe("⚡sam-goodwin/alchemy");
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
      class Issue extends GitHubIssue("i", { owner: "o", repo: "r" })`` {}
      class PR extends GitHubPullRequest("p", { owner: "o", repo: "r" })`` {}
      class Actions extends GitHubActions("a", { owner: "o", repo: "r" })`` {}
      class Clone extends GitHubClone("c", { path: "/tmp" })`` {}

      // Each type guard only matches its own type
      expect(isGitHubRepository(Repo)).toBe(true);
      expect(isGitHubRepository(Issue)).toBe(false);

      expect(isGitHubIssue(Issue)).toBe(true);
      expect(isGitHubIssue(PR)).toBe(false);

      expect(isGitHubPullRequest(PR)).toBe(true);
      expect(isGitHubPullRequest(Actions)).toBe(false);

      expect(isGitHubActions(Actions)).toBe(true);
      expect(isGitHubActions(Clone)).toBe(false);

      expect(isGitHubClone(Clone)).toBe(true);
      expect(isGitHubClone(Repo)).toBe(false);
    });
  });
});
