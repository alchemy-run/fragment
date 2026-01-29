/**
 * GitHub Actions fragment.
 *
 * References GitHub Actions workflow runs for a repository, providing
 * CI/CD status as context for agent interactions.
 */

import * as Effect from "effect/Effect";
import { defineFragment } from "../fragment.ts";
import { GitHub, type WorkflowRun as ServiceWorkflowRun } from "./service.ts";

/**
 * GitHub Actions properties for the fragment.
 */
export interface ActionsProps {
  /**
   * Repository owner (user or organization).
   */
  readonly owner: string;

  /**
   * Repository name.
   */
  readonly repo: string;

  /**
   * Maximum number of workflow runs to fetch.
   * @default 10
   */
  readonly limit?: number;
}

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
 * GitHub Actions workflow run interface for fragments.
 * Uses camelCase for consistency with fragment conventions.
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

/**
 * Fetch workflow runs for a repository from GitHub.
 */
export const fetchWorkflowRuns = (
  props: ActionsProps,
): Effect.Effect<WorkflowRun[], Error, GitHub> =>
  Effect.gen(function* () {
    const github = yield* GitHub;
    const runs = yield* github.listWorkflowRuns(props.owner, props.repo, {
      per_page: props.limit ?? 10,
    });
    return runs.map(toWorkflowRun);
  }).pipe(
    Effect.mapError((e) => new Error(`Failed to fetch workflow runs: ${e}`)),
  );

/**
 * GitHub Actions fragment factory.
 *
 * Creates a fragment that references GitHub Actions workflow runs,
 * providing CI/CD status as context for agents.
 *
 * @example
 * ```typescript
 * class AlchemyCI extends GitHubActions("alchemy-ci", {
 *   owner: "sam-goodwin",
 *   repo: "alchemy",
 *   limit: 5,
 * })`
 * # CI/CD Status
 *
 * Recent workflow runs for the Alchemy project.
 * ` {}
 * ```
 */
export const GitHubActions = defineFragment("github-actions")<ActionsProps>();

/**
 * Type guard for GitHub Actions fragments.
 */
export const isGitHubActions = GitHubActions.is;
