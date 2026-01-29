/**
 * GitHub Clone fragment.
 *
 * References a locally cloned GitHub repository, providing
 * information about the local git state.
 */

import * as Effect from "effect/Effect";
import { defineFragment } from "../fragment.ts";

/**
 * GitHub clone properties for the fragment.
 */
export interface CloneProps {
  /**
   * Path to the local repository clone.
   */
  readonly path: string;

  /**
   * Optional remote name.
   * @default "origin"
   */
  readonly remote?: string;
}

/**
 * Local clone information.
 */
export interface CloneInfo {
  /**
   * Absolute path to the repository.
   */
  readonly path: string;

  /**
   * Remote URL (e.g., git@github.com:owner/repo.git).
   */
  readonly remoteUrl: string;

  /**
   * Current branch name.
   */
  readonly branch: string;

  /**
   * Current commit SHA.
   */
  readonly sha: string;

  /**
   * Whether there are uncommitted changes.
   */
  readonly dirty: boolean;

  /**
   * Number of commits ahead of remote.
   */
  readonly ahead: number;

  /**
   * Number of commits behind remote.
   */
  readonly behind: number;

  /**
   * Repository owner (parsed from remote URL).
   */
  readonly owner: string;

  /**
   * Repository name (parsed from remote URL).
   */
  readonly repo: string;
}

/**
 * Parse owner and repo from a git remote URL.
 */
const parseRemoteUrl = (url: string): { owner: string; repo: string } => {
  // Handle SSH URLs: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  // Handle HTTPS URLs: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  return { owner: "", repo: "" };
};

/**
 * Execute a git command and return the output.
 */
const git = (
  args: string[],
  cwd: string,
): Effect.Effect<string, Error> =>
  Effect.tryPromise({
    try: async () => {
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);
      const result = await execAsync(`git ${args.join(" ")}`, { cwd });
      return result.stdout.trim();
    },
    catch: (e) => new Error(`Git command failed: ${e}`),
  });

/**
 * Fetch local clone information.
 */
export const fetchCloneInfo = (
  props: CloneProps,
): Effect.Effect<CloneInfo, Error> =>
  Effect.gen(function* () {
    const { path } = props;
    const remote = props.remote ?? "origin";

    // Get remote URL
    const remoteUrl = yield* git(["remote", "get-url", remote], path);
    const { owner, repo } = parseRemoteUrl(remoteUrl);

    // Get current branch
    const branch = yield* git(["rev-parse", "--abbrev-ref", "HEAD"], path);

    // Get current commit SHA
    const sha = yield* git(["rev-parse", "HEAD"], path);

    // Check for uncommitted changes
    const status = yield* git(["status", "--porcelain"], path);
    const dirty = status.length > 0;

    // Get ahead/behind counts
    const aheadBehind = yield* git(
      ["rev-list", "--left-right", "--count", `${remote}/${branch}...HEAD`],
      path,
    ).pipe(
      Effect.map((output) => {
        const [behind, ahead] = output.split(/\s+/).map(Number);
        return { ahead: ahead || 0, behind: behind || 0 };
      }),
      Effect.catchAll(() => Effect.succeed({ ahead: 0, behind: 0 })),
    );

    return {
      path,
      remoteUrl,
      branch,
      sha,
      dirty,
      ahead: aheadBehind.ahead,
      behind: aheadBehind.behind,
      owner,
      repo,
    };
  });

/**
 * GitHub Clone fragment factory.
 *
 * Creates a fragment that references a locally cloned GitHub repository,
 * providing information about the local git state.
 *
 * @example
 * ```typescript
 * class LocalAlchemy extends GitHubClone("local-alchemy", {
 *   path: "/Users/sam/projects/alchemy",
 * })`
 * # Local Alchemy Clone
 *
 * Working copy of the Alchemy repository.
 * ` {}
 * ```
 */
export const GitHubClone = defineFragment("github-clone")<CloneProps>();

/**
 * Type guard for GitHub Clone fragments.
 */
export const isGitHubClone = GitHubClone.is;
