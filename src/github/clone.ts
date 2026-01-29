/**
 * GitHub Clone fragment.
 *
 * References a locally cloned GitHub repository, providing
 * information about the local git state.
 */

import { Command, CommandExecutor } from "@effect/platform";
import * as Effect from "effect/Effect";
import * as Path from "node:path";
import { FragmentConfig } from "../config.ts";
import { defineFragment, type Fragment } from "../fragment.ts";

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
 * Resolve a path relative to the FragmentConfig cwd.
 */
const resolvePath = (
  path: string,
): Effect.Effect<string, never, FragmentConfig> =>
  Effect.gen(function* () {
    const config = yield* FragmentConfig;
    return Path.isAbsolute(path) ? path : Path.resolve(config.cwd, path);
  });

/**
 * Execute a git command and return the output.
 */
const git = (
  args: string[],
  path: string,
): Effect.Effect<string, Error, CommandExecutor.CommandExecutor | FragmentConfig> =>
  Effect.gen(function* () {
    const cwd = yield* resolvePath(path);
    const command = Command.make("git", ...args).pipe(Command.workingDirectory(cwd));
    const output = yield* Command.string(command);
    return output.trim();
  }).pipe(Effect.mapError((e) => new Error(`Git command failed: ${e}`)));

/**
 * Fetch local clone information.
 */
export const fetchCloneInfo = (
  props: CloneProps,
): Effect.Effect<CloneInfo, Error, CommandExecutor.CommandExecutor | FragmentConfig> =>
  Effect.gen(function* () {
    const { path } = props;
    const remote = props.remote ?? "origin";

    // Resolve the path relative to FragmentConfig cwd
    const resolvedPath = yield* resolvePath(path);

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
      path: resolvedPath,
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
import { GitHubCloneSidebar } from "./tui/sidebar.tsx";

/**
 * GitHubClone type - a fragment representing a locally cloned GitHub repository.
 * Extends Fragment for template support with path and remote properties.
 */
export interface GitHubClone<
  ID extends string = string,
  References extends any[] = any[],
> extends Fragment<"github-clone", ID, References> {
  readonly path: string;
  readonly remote: string;
}

export const GitHubClone = defineFragment("github-clone")<CloneProps>({
  render: {
    context: (clone: GitHubClone) => `📂${clone.path}`,
    tui: {
      sidebar: GitHubCloneSidebar,
      icon: "📂",
      sectionTitle: "Local Clones",
    },
  },
});

/**
 * Type guard for GitHub Clone fragments.
 */
export const isGitHubClone = GitHubClone.is;
