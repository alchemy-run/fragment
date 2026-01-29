/**
 * GitHub Effect service for API interactions.
 *
 * Provides an Effect-native interface to the GitHub REST API with
 * proper error handling, streaming support, and type safety.
 */

import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import { GitHubCredentialsTag } from "./credentials.ts";

// ============================================================================
// Shared Types
// ============================================================================

/**
 * GitHub user or organization.
 */
export interface GitHubUser {
  readonly id: number;
  readonly login: string;
  readonly avatar_url: string;
  readonly url: string;
  readonly type: "User" | "Organization";
}

/**
 * GitHub label.
 */
export interface Label {
  readonly id: number;
  readonly name: string;
  readonly color: string;
  readonly description: string | null;
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Base error for GitHub API failures.
 */
export class GitHubError extends Data.TaggedError("GitHubError")<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}

/**
 * Error when a resource is not found.
 */
export class GitHubNotFoundError extends Data.TaggedError("GitHubNotFoundError")<{
  readonly resource: string;
  readonly owner: string;
  readonly repo?: string;
  readonly number?: number;
}> {}

/**
 * Error when rate limit is exceeded.
 */
export class GitHubRateLimitError extends Data.TaggedError("GitHubRateLimitError")<{
  readonly resetAt: Date;
  readonly remaining: number;
}> {}

/**
 * Error when authentication fails.
 */
export class GitHubAuthError extends Data.TaggedError("GitHubAuthError")<{
  readonly message: string;
}> {}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * GitHub service interface.
 *
 * Provides Effect-based methods for interacting with GitHub's REST API.
 */
export interface GitHubService {
  // Repository operations
  getRepository(
    owner: string,
    repo: string,
  ): Effect.Effect<Repository, GitHubServiceError>;

  listRepositories(
    owner: string,
  ): Effect.Effect<Repository[], GitHubServiceError>;

  // Issue operations
  listIssues(
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all"; per_page?: number },
  ): Effect.Effect<Issue[], GitHubServiceError>;

  getIssue(
    owner: string,
    repo: string,
    number: number,
  ): Effect.Effect<Issue, GitHubServiceError>;

  // Pull Request operations
  listPullRequests(
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all"; per_page?: number },
  ): Effect.Effect<PullRequest[], GitHubServiceError>;

  getPullRequest(
    owner: string,
    repo: string,
    number: number,
  ): Effect.Effect<PullRequest, GitHubServiceError>;

  // Actions operations
  listWorkflowRuns(
    owner: string,
    repo: string,
    options?: { per_page?: number },
  ): Effect.Effect<WorkflowRun[], GitHubServiceError>;

  // Streaming subscriptions (polling-based for real-time updates)
  watchIssues(
    owner: string,
    repo: string,
    pollInterval?: number,
  ): Stream.Stream<Issue[], GitHubServiceError>;
}

/**
 * Context tag for the GitHub service.
 */
export class GitHub extends Context.Tag("GitHub")<GitHub, GitHubService>() {}

// ============================================================================
// Type Definitions (imported from fragment files or defined here for service)
// ============================================================================

/**
 * Repository type for the service layer.
 */
export interface Repository {
  readonly id: number;
  readonly node_id: string;
  readonly name: string;
  readonly full_name: string;
  readonly owner: GitHubUser;
  readonly private: boolean;
  readonly description: string | null;
  readonly fork: boolean;
  readonly url: string;
  readonly html_url: string;
  readonly clone_url: string;
  readonly ssh_url: string;
  readonly default_branch: string;
  readonly language: string | null;
  readonly stargazers_count: number;
  readonly watchers_count: number;
  readonly forks_count: number;
  readonly open_issues_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly pushed_at: string;
  readonly topics: readonly string[];
}

/**
 * Issue type for the service layer.
 */
export interface Issue {
  readonly id: number;
  readonly node_id: string;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: "open" | "closed";
  readonly state_reason: "completed" | "reopened" | "not_planned" | null;
  readonly user: GitHubUser;
  readonly assignees: readonly GitHubUser[];
  readonly labels: readonly Label[];
  readonly comments: number;
  readonly html_url: string;
  readonly url: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly closed_at: string | null;
}

/**
 * Pull request type for the service layer.
 */
export interface PullRequest {
  readonly id: number;
  readonly node_id: string;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: "open" | "closed";
  readonly user: GitHubUser;
  readonly assignees: readonly GitHubUser[];
  readonly labels: readonly Label[];
  readonly html_url: string;
  readonly url: string;
  readonly diff_url: string;
  readonly patch_url: string;
  readonly draft: boolean;
  readonly merged: boolean;
  readonly mergeable: boolean | null;
  readonly merged_by: GitHubUser | null;
  readonly merged_at: string | null;
  readonly comments: number;
  readonly review_comments: number;
  readonly commits: number;
  readonly additions: number;
  readonly deletions: number;
  readonly changed_files: number;
  readonly head: {
    readonly ref: string;
    readonly sha: string;
  };
  readonly base: {
    readonly ref: string;
    readonly sha: string;
  };
  readonly created_at: string;
  readonly updated_at: string;
  readonly closed_at: string | null;
}

/**
 * Workflow run type for the service layer.
 */
export interface WorkflowRun {
  readonly id: number;
  readonly node_id: string;
  readonly name: string;
  readonly head_branch: string;
  readonly head_sha: string;
  readonly run_number: number;
  readonly event: string;
  readonly status: "queued" | "in_progress" | "completed" | "waiting" | "requested" | "pending";
  readonly conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | "stale" | null;
  readonly workflow_id: number;
  readonly url: string;
  readonly html_url: string;
  readonly actor: GitHubUser;
  readonly run_started_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * All possible GitHub service errors.
 */
export type GitHubServiceError =
  | GitHubError
  | GitHubNotFoundError
  | GitHubRateLimitError
  | GitHubAuthError;

/**
 * Creates the GitHub service implementation.
 */
const makeGitHubService = Effect.gen(function* () {
  const credentials = yield* GitHubCredentialsTag;
  const httpClient = yield* HttpClient.HttpClient;

  const baseUrl = credentials.baseUrl ?? "https://api.github.com";

  /**
   * Make an authenticated request to the GitHub API.
   */
  const request = <T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    options?: { body?: unknown; params?: Record<string, string | number | undefined> },
  ): Effect.Effect<T, GitHubServiceError> =>
    Effect.gen(function* () {
      let url = `${baseUrl}${path}`;

      // Add query parameters
      if (options?.params) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.params)) {
          if (value !== undefined) {
            params.set(key, String(value));
          }
        }
        const paramString = params.toString();
        if (paramString) {
          url += `?${paramString}`;
        }
      }

      const req = HttpClientRequest.make(method)(url).pipe(
        HttpClientRequest.setHeader("Authorization", `Bearer ${credentials.token}`),
        HttpClientRequest.setHeader("Accept", "application/vnd.github+json"),
        HttpClientRequest.setHeader("X-GitHub-Api-Version", "2022-11-28"),
      );

      const response = yield* httpClient.execute(req).pipe(
        Effect.mapError((err) => new GitHubError({ message: `Request failed: ${err}`, cause: err })),
      );

      // Handle error responses
      if (response.status === 401) {
        return yield* Effect.fail(new GitHubAuthError({ message: "Invalid or expired token" }));
      }

      if (response.status === 403) {
        return yield* Effect.fail(new GitHubAuthError({ message: "Forbidden" }));
      }

      if (response.status === 404) {
        return yield* Effect.fail(
          new GitHubNotFoundError({
            resource: path,
            owner: "",
            repo: undefined,
          }),
        );
      }

      if (response.status >= 400) {
        return yield* Effect.fail(
          new GitHubError({
            message: `GitHub API error: ${response.status}`,
            status: response.status,
          }),
        );
      }

      const json = yield* Effect.tryPromise({
        try: () => response.json,
        catch: (err) => new GitHubError({ message: `Failed to parse response: ${err}`, cause: err }),
      });

      return json as T;
    });

  const service: GitHubService = {
    getRepository: (owner, repo) =>
      request<Repository>("GET", `/repos/${owner}/${repo}`).pipe(
        Effect.catchTag("GitHubNotFoundError", () =>
          Effect.fail(new GitHubNotFoundError({ resource: "repository", owner, repo })),
        ),
      ),

    listRepositories: (owner) =>
      request<Repository[]>("GET", `/users/${owner}/repos`, { params: { per_page: 100 } }),

    listIssues: (owner, repo, options) =>
      request<Issue[]>("GET", `/repos/${owner}/${repo}/issues`, {
        params: {
          state: options?.state ?? "open",
          per_page: options?.per_page ?? 30,
        },
      }).pipe(
        Effect.catchTag("GitHubNotFoundError", () =>
          Effect.fail(new GitHubNotFoundError({ resource: "issues", owner, repo })),
        ),
      ),

    getIssue: (owner, repo, number) =>
      request<Issue>("GET", `/repos/${owner}/${repo}/issues/${number}`).pipe(
        Effect.catchTag("GitHubNotFoundError", () =>
          Effect.fail(new GitHubNotFoundError({ resource: "issue", owner, repo, number })),
        ),
      ),

    listPullRequests: (owner, repo, options) =>
      request<PullRequest[]>("GET", `/repos/${owner}/${repo}/pulls`, {
        params: {
          state: options?.state ?? "open",
          per_page: options?.per_page ?? 30,
        },
      }).pipe(
        Effect.catchTag("GitHubNotFoundError", () =>
          Effect.fail(new GitHubNotFoundError({ resource: "pull_requests", owner, repo })),
        ),
      ),

    getPullRequest: (owner, repo, number) =>
      request<PullRequest>("GET", `/repos/${owner}/${repo}/pulls/${number}`).pipe(
        Effect.catchTag("GitHubNotFoundError", () =>
          Effect.fail(new GitHubNotFoundError({ resource: "pull_request", owner, repo, number })),
        ),
      ),

    listWorkflowRuns: (owner, repo, options) =>
      request<{ workflow_runs: WorkflowRun[] }>("GET", `/repos/${owner}/${repo}/actions/runs`, {
        params: { per_page: options?.per_page ?? 10 },
      }).pipe(
        Effect.map((r) => r.workflow_runs),
        Effect.catchTag("GitHubNotFoundError", () =>
          Effect.fail(new GitHubNotFoundError({ resource: "workflow_runs", owner, repo })),
        ),
      ),

    watchIssues: (owner, repo, pollInterval = 30000) =>
      Stream.repeatEffectWithSchedule(
        service.listIssues(owner, repo),
        Schedule.spaced(pollInterval),
      ),
  };

  return service;
});

/**
 * Layer that provides the GitHub service.
 *
 * Requires GitHubCredentials and HttpClient to be provided.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const github = yield* GitHub;
 *   const repo = yield* github.getRepository("owner", "repo");
 *   console.log(repo.full_name);
 * });
 *
 * program.pipe(
 *   Effect.provide(GitHubLive),
 *   Effect.provide(GitHubCredentialsFromEnv),
 *   Effect.provide(NodeHttpClient.layer),
 * );
 * ```
 */
export const GitHubLive: Layer.Layer<
  GitHub,
  never,
  GitHubCredentialsTag | HttpClient.HttpClient
> = Layer.effect(GitHub, makeGitHubService);
