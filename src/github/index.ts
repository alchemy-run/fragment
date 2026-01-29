/**
 * GitHub integration for Fragment.
 *
 * Provides fragments for referencing GitHub repositories, issues,
 * pull requests, actions, and local clones.
 *
 * @example
 * ```typescript
 * import { GitHubRepository, GitHubIssue, GitHubPullRequest } from "fragment/github";
 *
 * class MyRepo extends GitHubRepository("my-repo", {
 *   owner: "my-org",
 *   repo: "my-project",
 * })`
 * # My Project Repository
 * ` {}
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

// Repository fragment
export {
  GitHubRepository,
  isGitHubRepository,
  fetchRepository,
  toRepository,
  type Repository,
  type RepositoryProps,
} from "./repository.ts";

// Issue fragment
export {
  GitHubIssue,
  isGitHubIssue,
  fetchIssue,
  fetchIssues,
  watchIssues,
  toIssue,
  type Issue,
  type IssueProps,
} from "./issue.ts";

// Pull Request fragment
export {
  GitHubPullRequest,
  isGitHubPullRequest,
  fetchPullRequest,
  fetchPullRequests,
  toPullRequest,
  type PullRequest,
  type PullRequestProps,
} from "./pull-request.ts";

// Actions fragment
export {
  GitHubActions,
  isGitHubActions,
  fetchWorkflowRuns,
  toWorkflowRun,
  type WorkflowRun,
  type WorkflowRunStatus,
  type WorkflowRunConclusion,
  type ActionsProps,
} from "./actions.ts";

// Clone fragment
export {
  GitHubClone,
  isGitHubClone,
  fetchCloneInfo,
  type CloneInfo,
  type CloneProps,
} from "./clone.ts";
