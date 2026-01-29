/**
 * GitHub Pull Request fragment.
 *
 * References GitHub pull requests for a repository, providing
 * PR data as context for agent interactions.
 */

import * as Effect from "effect/Effect";
import { defineFragment } from "../fragment.ts";
import { GitHub, type PullRequest as ServicePullRequest, type GitHubUser, type Label } from "./service.ts";

/**
 * GitHub pull request properties for the fragment.
 */
export interface PullRequestProps {
  /**
   * Repository owner (user or organization).
   */
  readonly owner: string;

  /**
   * Repository name.
   */
  readonly repo: string;

  /**
   * Optional PR number for a specific pull request.
   * If omitted, references all PRs in the repository.
   */
  readonly number?: number;

  /**
   * Filter by PR state.
   * @default "open"
   */
  readonly state?: "open" | "closed" | "all";
}

/**
 * GitHub pull request interface for fragments.
 * Uses camelCase for consistency with fragment conventions.
 */
export interface PullRequest {
  readonly id: number;
  readonly nodeId: string;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: "open" | "closed";
  readonly user: {
    readonly login: string;
    readonly avatarUrl: string;
  };
  readonly assignees: readonly string[];
  readonly labels: readonly string[];
  readonly htmlUrl: string;
  readonly url: string;
  readonly diffUrl: string;
  readonly patchUrl: string;
  readonly draft: boolean;
  readonly merged: boolean;
  readonly mergeable: boolean | null;
  readonly mergedBy: string | null;
  readonly mergedAt: string | null;
  readonly comments: number;
  readonly reviewComments: number;
  readonly commits: number;
  readonly additions: number;
  readonly deletions: number;
  readonly changedFiles: number;
  readonly headRef: string;
  readonly headSha: string;
  readonly baseRef: string;
  readonly baseSha: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
}

/**
 * Convert service pull request to fragment pull request.
 */
export const toPullRequest = (pr: ServicePullRequest): PullRequest => ({
  id: pr.id,
  nodeId: pr.node_id,
  number: pr.number,
  title: pr.title,
  body: pr.body,
  state: pr.state,
  user: {
    login: pr.user.login,
    avatarUrl: pr.user.avatar_url,
  },
  assignees: pr.assignees.map((a: GitHubUser) => a.login),
  labels: pr.labels.map((l: Label) => l.name),
  htmlUrl: pr.html_url,
  url: pr.url,
  diffUrl: pr.diff_url,
  patchUrl: pr.patch_url,
  draft: pr.draft,
  merged: pr.merged,
  mergeable: pr.mergeable,
  mergedBy: pr.merged_by?.login ?? null,
  mergedAt: pr.merged_at,
  comments: pr.comments,
  reviewComments: pr.review_comments,
  commits: pr.commits,
  additions: pr.additions,
  deletions: pr.deletions,
  changedFiles: pr.changed_files,
  headRef: pr.head.ref,
  headSha: pr.head.sha,
  baseRef: pr.base.ref,
  baseSha: pr.base.sha,
  createdAt: pr.created_at,
  updatedAt: pr.updated_at,
  closedAt: pr.closed_at,
});

/**
 * Fetch a single pull request from GitHub.
 */
export const fetchPullRequest = (
  owner: string,
  repo: string,
  number: number,
): Effect.Effect<PullRequest, Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const pr = yield* github.getPullRequest(owner, repo, number);
    return toPullRequest(pr);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch pull request: ${e}`)),
  );

/**
 * Fetch all pull requests for a repository from GitHub.
 */
export const fetchPullRequests = (
  props: PullRequestProps,
): Effect.Effect<PullRequest[], Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const prs = yield* github.listPullRequests(props.owner, props.repo, {
      state: props.state ?? "open",
    });
    return prs.map(toPullRequest);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch pull requests: ${e}`)),
  );

/**
 * GitHub Pull Request fragment factory.
 *
 * Creates a fragment that references GitHub pull requests, providing
 * PR data as context for agents.
 *
 * @example
 * ```typescript
 * // Reference all open PRs
 * class AlchemyPRs extends GitHubPullRequest("alchemy-prs", {
 *   owner: "sam-goodwin",
 *   repo: "alchemy",
 * })`
 * # Open Pull Requests
 *
 * Current open PRs for review.
 * ` {}
 *
 * // Reference a specific PR
 * class FeaturePR extends GitHubPullRequest("feature-pr", {
 *   owner: "sam-goodwin",
 *   repo: "alchemy",
 *   number: 456,
 * })`
 * # Feature: Add GitHub Integration
 *
 * PR adding GitHub fragment support.
 * ` {}
 * ```
 */
export const GitHubPullRequest = defineFragment("github-pull-request")<
  PullRequestProps
>();

/**
 * Type guard for GitHub Pull Request fragments.
 */
export const isGitHubPullRequest = GitHubPullRequest.is;
