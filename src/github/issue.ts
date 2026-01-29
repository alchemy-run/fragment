/**
 * GitHub Issue fragment.
 *
 * References GitHub issues for a repository, providing
 * issue data as context for agent interactions.
 */

import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { defineFragment } from "../fragment.ts";
import { GitHub, type Issue as ServiceIssue, type GitHubUser, type Label } from "./service.ts";

/**
 * GitHub issue properties for the fragment.
 */
export interface IssueProps {
  /**
   * Repository owner (user or organization).
   */
  readonly owner: string;

  /**
   * Repository name.
   */
  readonly repo: string;

  /**
   * Optional issue number for a specific issue.
   * If omitted, references all issues in the repository.
   */
  readonly number?: number;

  /**
   * Filter by issue state.
   * @default "open"
   */
  readonly state?: "open" | "closed" | "all";
}

/**
 * GitHub issue interface for fragments.
 * Uses camelCase for consistency with fragment conventions.
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

/**
 * Fetch a single issue from GitHub.
 */
export const fetchIssue = (
  owner: string,
  repo: string,
  number: number,
): Effect.Effect<Issue, Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const issue = yield* github.getIssue(owner, repo, number);
    return toIssue(issue);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch issue: ${e}`)),
  );

/**
 * Fetch all issues for a repository from GitHub.
 */
export const fetchIssues = (
  props: IssueProps,
): Effect.Effect<Issue[], Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const issues = yield* github.listIssues(props.owner, props.repo, {
      state: props.state ?? "open",
    });
    return issues.map(toIssue);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch issues: ${e}`)),
  );

/**
 * Watch issues for real-time updates (polling-based).
 */
export const watchIssues = (
  owner: string,
  repo: string,
  pollInterval?: number,
): Stream.Stream<Issue[], Error, GitHub> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const github = yield* GitHub;
      return github.watchIssues(owner, repo, pollInterval).pipe(
        Stream.map((issues) => issues.map(toIssue)),
      );
    }),
  ).pipe(
    Stream.mapError((e) => new Error(`Failed to watch issues: ${e}`)),
  );

/**
 * GitHub Issue fragment factory.
 *
 * Creates a fragment that references GitHub issues, providing
 * issue data as context for agents.
 *
 * @example
 * ```typescript
 * // Reference all open issues
 * class AlchemyIssues extends GitHubIssue("alchemy-issues", {
 *   owner: "sam-goodwin",
 *   repo: "alchemy",
 * })`
 * # Open Issues
 *
 * Current open issues for the Alchemy project.
 * ` {}
 *
 * // Reference a specific issue
 * class BugReport extends GitHubIssue("bug-123", {
 *   owner: "sam-goodwin",
 *   repo: "alchemy",
 *   number: 123,
 * })`
 * # Bug Report #123
 *
 * Critical bug that needs fixing.
 * ` {}
 * ```
 */
export const GitHubIssue = defineFragment("github-issue")<IssueProps>();

/**
 * Type guard for GitHub Issue fragments.
 */
export const isGitHubIssue = GitHubIssue.is;
