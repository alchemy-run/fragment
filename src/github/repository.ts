/**
 * GitHub Repository fragment.
 *
 * A unified fragment for referencing a GitHub repository with access
 * to its metadata, issues, pull requests, and actions.
 */

import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { defineFragment, type Fragment } from "../fragment.ts";
import {
  GitHub,
  type Repository as ServiceRepository,
  type Issue as ServiceIssue,
  type PullRequest as ServicePullRequest,
  type WorkflowRun as ServiceWorkflowRun,
  type GitHubUser,
  type Label,
} from "./service.ts";


/**
 * GitHub Repository fragment factory.
 *
 * Creates a fragment that references a GitHub repository with access to
 * its metadata, issues, pull requests, and actions.
 *
 * @example
 * ```typescript
 * // Define a repository fragment
 * class CloudflareSDK extends GitHubRepository("cloudflare-sdk", {
 *   owner: "cloudflare",
 *   repo: "cloudflare-typescript",
 * })`
 * # Cloudflare TypeScript SDK
 *
 * Official SDK for the Cloudflare API.
 * ` {}
 *
 * // Access repository data via helper functions
 * const repo = yield* fetchRepository(CloudflareSDK.props);
 * const issues = yield* fetchIssues(CloudflareSDK.props, { state: "open" });
 * const prs = yield* fetchPullRequests(CloudflareSDK.props);
 * const runs = yield* fetchWorkflowRuns(CloudflareSDK.props, { limit: 5 });
 * ```
 */
import { GitHubRepositoryContent } from "./tui/content.tsx";
import { GitHubRepositorySidebar } from "./tui/sidebar.tsx";

/**
 * GitHubRepository type - a fragment representing a GitHub repository.
 * Extends Fragment for template support with owner and repo properties.
 */
export interface GitHubRepository<
  ID extends string = string,
  References extends any[] = any[],
> extends Fragment<"github-repository", ID, References> {
  readonly owner: string;
  readonly repo: string;
  readonly defaultBranch: string;
}

export const GitHubRepository = defineFragment("github-repository")<RepositoryProps>({
  render: {
    context: (repo: GitHubRepository) => {
      return `📦${repo.owner}/${repo.repo}`;
    },
    tui: {
      sidebar: GitHubRepositorySidebar,
      content: GitHubRepositoryContent,
      focusable: false,
      icon: "📦",
      sectionTitle: "Repositories",
    },
  },
});

/**
 * Type guard for GitHub Repository fragments.
 */
export const isGitHubRepository = GitHubRepository.is;

// ============================================================================
// Props
// ============================================================================

/**
 * GitHub repository properties for the fragment.
 */
export interface RepositoryProps {
  /**
   * Repository owner (user or organization).
   */
  readonly owner: string;

  /**
   * Repository name.
   */
  readonly repo: string;

  /**
   * Default branch name.
   * @default "main"
   */
  readonly defaultBranch?: string;
}

// ============================================================================
// Repository Types
// ============================================================================

/**
 * GitHub repository metadata.
 */
export interface Repository {
  readonly id: number;
  readonly nodeId: string;
  readonly name: string;
  readonly fullName: string;
  readonly owner: string;
  readonly private: boolean;
  readonly description: string | null;
  readonly fork: boolean;
  readonly url: string;
  readonly htmlUrl: string;
  readonly cloneUrl: string;
  readonly sshUrl: string;
  readonly defaultBranch: string;
  readonly language: string | null;
  readonly stargazersCount: number;
  readonly watchersCount: number;
  readonly forksCount: number;
  readonly openIssuesCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pushedAt: string;
  readonly topics: readonly string[];
}

/**
 * Convert service repository to fragment repository.
 */
export const toRepository = (r: ServiceRepository): Repository => ({
  id: r.id,
  nodeId: r.node_id,
  name: r.name,
  fullName: r.full_name,
  owner: r.owner.login,
  private: r.private,
  description: r.description,
  fork: r.fork,
  url: r.url,
  htmlUrl: r.html_url,
  cloneUrl: r.clone_url,
  sshUrl: r.ssh_url,
  defaultBranch: r.default_branch,
  language: r.language,
  stargazersCount: r.stargazers_count,
  watchersCount: r.watchers_count,
  forksCount: r.forks_count,
  openIssuesCount: r.open_issues_count,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  pushedAt: r.pushed_at,
  topics: r.topics,
});

// ============================================================================
// Issue Types
// ============================================================================

/**
 * GitHub issue.
 */
export interface Issue {
  readonly id: number;
  readonly nodeId: string;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: "open" | "closed";
  readonly stateReason: "completed" | "reopened" | "not_planned" | null;
  readonly user: {
    readonly login: string;
    readonly avatarUrl: string;
  };
  readonly assignees: readonly string[];
  readonly labels: readonly string[];
  readonly comments: number;
  readonly htmlUrl: string;
  readonly url: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
}

/**
 * Convert service issue to fragment issue.
 */
export const toIssue = (i: ServiceIssue): Issue => ({
  id: i.id,
  nodeId: i.node_id,
  number: i.number,
  title: i.title,
  body: i.body,
  state: i.state,
  stateReason: i.state_reason,
  user: {
    login: i.user.login,
    avatarUrl: i.user.avatar_url,
  },
  assignees: i.assignees.map((a: GitHubUser) => a.login),
  labels: i.labels.map((l: Label) => l.name),
  comments: i.comments,
  htmlUrl: i.html_url,
  url: i.url,
  createdAt: i.created_at,
  updatedAt: i.updated_at,
  closedAt: i.closed_at,
});

// ============================================================================
// Pull Request Types
// ============================================================================

/**
 * GitHub pull request.
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

// ============================================================================
// Workflow Run Types
// ============================================================================

/**
 * Workflow run status.
 */
export type WorkflowRunStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "waiting"
  | "requested"
  | "pending";

/**
 * Workflow run conclusion.
 */
export type WorkflowRunConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | "stale"
  | null;

/**
 * GitHub Actions workflow run.
 */
export interface WorkflowRun {
  readonly id: number;
  readonly nodeId: string;
  readonly name: string;
  readonly headBranch: string;
  readonly headSha: string;
  readonly runNumber: number;
  readonly event: string;
  readonly status: WorkflowRunStatus;
  readonly conclusion: WorkflowRunConclusion;
  readonly workflowId: number;
  readonly url: string;
  readonly htmlUrl: string;
  readonly actor: string;
  readonly runStartedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Convert service workflow run to fragment workflow run.
 */
export const toWorkflowRun = (run: ServiceWorkflowRun): WorkflowRun => ({
  id: run.id,
  nodeId: run.node_id,
  name: run.name,
  headBranch: run.head_branch,
  headSha: run.head_sha,
  runNumber: run.run_number,
  event: run.event,
  status: run.status,
  conclusion: run.conclusion,
  workflowId: run.workflow_id,
  url: run.url,
  htmlUrl: run.html_url,
  actor: run.actor.login,
  runStartedAt: run.run_started_at,
  createdAt: run.created_at,
  updatedAt: run.updated_at,
});

// ============================================================================
// Repository Methods
// ============================================================================

/**
 * Fetch repository metadata from GitHub.
 */
export const fetchRepository = (
  props: RepositoryProps,
): Effect.Effect<Repository, Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const repo = yield* github.getRepository(props.owner, props.repo);
    return toRepository(repo);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch repository: ${e}`)),
  );

/**
 * Fetch a single issue from the repository.
 */
export const fetchIssue = (
  props: RepositoryProps,
  number: number,
): Effect.Effect<Issue, Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const issue = yield* github.getIssue(props.owner, props.repo, number);
    return toIssue(issue);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch issue: ${e}`)),
  );

/**
 * Options for listing issues.
 */
export interface ListIssuesOptions {
  /**
   * Filter by issue state.
   * @default "open"
   */
  readonly state?: "open" | "closed" | "all";
}

/**
 * Fetch all issues for the repository.
 */
export const fetchIssues = (
  props: RepositoryProps,
  options?: ListIssuesOptions,
): Effect.Effect<Issue[], Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const issues = yield* github.listIssues(props.owner, props.repo, {
      state: options?.state ?? "open",
    });
    return issues.map(toIssue);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch issues: ${e}`)),
  );

/**
 * Watch issues for real-time updates (polling-based).
 */
export const watchIssues = (
  props: RepositoryProps,
  pollInterval?: number,
): Stream.Stream<Issue[], Error, GitHub> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const github = yield* GitHub;
      return github.watchIssues(props.owner, props.repo, pollInterval).pipe(
        Stream.map((issues) => issues.map(toIssue)),
      );
    }),
  ).pipe(
    Stream.mapError((e) => new Error(`Failed to watch issues: ${e}`)),
  );

/**
 * Fetch a single pull request from the repository.
 */
export const fetchPullRequest = (
  props: RepositoryProps,
  number: number,
): Effect.Effect<PullRequest, Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const pr = yield* github.getPullRequest(props.owner, props.repo, number);
    return toPullRequest(pr);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch pull request: ${e}`)),
  );

/**
 * Options for listing pull requests.
 */
export interface ListPullRequestsOptions {
  /**
   * Filter by PR state.
   * @default "open"
   */
  readonly state?: "open" | "closed" | "all";
}

/**
 * Fetch all pull requests for the repository.
 */
export const fetchPullRequests = (
  props: RepositoryProps,
  options?: ListPullRequestsOptions,
): Effect.Effect<PullRequest[], Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const prs = yield* github.listPullRequests(props.owner, props.repo, {
      state: options?.state ?? "open",
    });
    return prs.map(toPullRequest);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch pull requests: ${e}`)),
  );

/**
 * Options for listing workflow runs.
 */
export interface ListWorkflowRunsOptions {
  /**
   * Maximum number of workflow runs to fetch.
   * @default 10
   */
  readonly limit?: number;
}

/**
 * Fetch workflow runs for the repository.
 */
export const fetchWorkflowRuns = (
  props: RepositoryProps,
  options?: ListWorkflowRunsOptions,
): Effect.Effect<WorkflowRun[], Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const runs = yield* github.listWorkflowRuns(props.owner, props.repo, {
      per_page: options?.limit ?? 10,
    });
    return runs.map(toWorkflowRun);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch workflow runs: ${e}`)),
  );

