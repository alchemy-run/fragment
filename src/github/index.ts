/**
 * GitHub integration for Fragment.
 *
 * Provides a unified repository fragment for referencing GitHub repositories,
 * with access to issues, pull requests, actions, and local clones.
 *
 * @example
 * ```typescript
 * import { GitHubRepository, fetchIssues, fetchPullRequests } from "fragment/github";
 *
 * class CloudflareSDK extends GitHubRepository("cloudflare-sdk", {
 *   owner: "cloudflare",
 *   repo: "cloudflare-typescript",
 * })`
 * # Cloudflare TypeScript SDK
 * ` {}
 *
 * // Access repository data
 * const issues = yield* fetchIssues(CloudflareSDK.props, { state: "open" });
 * const prs = yield* fetchPullRequests(CloudflareSDK.props);
 * ```
 */

// Credentials
export {
  GitHubCredentialsTag,
  GitHubCredentialsFromEnv,
  GitHubCredentialsFrom,
  type GitHubCredentials,
} from "./credentials.ts";

// Service
export {
  GitHub,
  GitHubLive,
  GitHubError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  GitHubAuthError,
  type GitHubService,
  type GitHubUser,
  type Label,
} from "./service.ts";

// Repository fragment (unified access to repo, issues, PRs, actions)
export {
  // Fragment
  GitHubRepository,
  isGitHubRepository,
  type RepositoryProps,
  // Repository
  fetchRepository,
  toRepository,
  type Repository,
  // Issues
  fetchIssue,
  fetchIssues,
  watchIssues,
  toIssue,
  type Issue,
  type ListIssuesOptions,
  // Pull Requests
  fetchPullRequest,
  fetchPullRequests,
  toPullRequest,
  type PullRequest,
  type ListPullRequestsOptions,
  // Actions / Workflow Runs
  fetchWorkflowRuns,
  toWorkflowRun,
  type WorkflowRun,
  type WorkflowRunStatus,
  type WorkflowRunConclusion,
  type ListWorkflowRunsOptions,
} from "./repository.ts";

// Clone fragment (local repository)
export {
  GitHubClone,
  isGitHubClone,
  fetchCloneInfo,
  type CloneInfo,
  type CloneProps,
} from "./clone.ts";
