/**
 * GitHub Repository fragment.
 *
 * References a GitHub repository with its metadata, providing
 * context about the repo for agent interactions.
 */

import * as Effect from "effect/Effect";
import { defineFragment } from "../fragment.ts";
import { GitHub, type Repository as ServiceRepository } from "./service.ts";

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
}

/**
 * GitHub repository interface for fragments.
 * Uses camelCase for consistency with fragment conventions.
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

/**
 * Fetch repository data from GitHub.
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
 * GitHub Repository fragment factory.
 *
 * Creates a fragment that references a GitHub repository, providing
 * repository metadata as context for agents.
 *
 * @example
 * ```typescript
 * class AlchemyRepo extends GitHubRepository("alchemy", {
 *   owner: "sam-goodwin",
 *   repo: "alchemy",
 * })`
 * # Alchemy
 *
 * Infrastructure-as-Code framework for TypeScript.
 * ` {}
 * ```
 */
export const GitHubRepository = defineFragment("github-repository")<
  RepositoryProps
>();

/**
 * Type guard for GitHub Repository fragments.
 */
export const isGitHubRepository = GitHubRepository.is;
