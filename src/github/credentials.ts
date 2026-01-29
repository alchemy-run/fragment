/**
 * GitHub credentials service for Effect-based authentication.
 *
 * Provides a Context.Tag for GitHub API authentication that can be
 * configured from environment variables, the `gh` CLI, or provided explicitly.
 */

import { Command, CommandExecutor } from "@effect/platform";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

/**
 * GitHub credentials for API authentication.
 */
export interface GitHubCredentials {
  /**
   * GitHub personal access token or GitHub App token.
   */
  readonly token: string;

  /**
   * Optional GitHub API base URL for GitHub Enterprise.
   * @default "https://api.github.com"
   */
  readonly baseUrl: string;
}

/**
 * Context tag for GitHub credentials.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const credentials = yield* GitHubCredentialsTag;
 *   console.log(`Using token: ${credentials.token.slice(0, 8)}...`);
 * });
 * ```
 */
export class GitHubCredentialsTag extends Context.Tag("GitHubCredentials")<
  GitHubCredentialsTag,
  GitHubCredentials
>() {}

/**
 * Get the GitHub token from the `gh auth token` CLI command.
 * This works if the user has already authenticated with `gh auth login`.
 */
const getTokenFromGhCli: Effect.Effect<
  string,
  Error,
  CommandExecutor.CommandExecutor
> = Effect.gen(function* () {
  const command = Command.make("gh", "auth", "token");
  const output = yield* Command.string(command).pipe(
    Effect.mapError((e) => new Error(`Failed to run gh auth token: ${e}`)),
  );
  const token = output.trim();
  if (!token) {
    return yield* Effect.fail(
      new Error("gh auth token returned empty output"),
    );
  }
  return token;
});

/**
 * Effect that resolves GitHub credentials from Config or `gh` CLI fallback.
 *
 * Priority:
 * 1. GITHUB_TOKEN from Config (environment variable or .env)
 * 2. `gh auth token` CLI command (if user is logged in via `gh auth login`)
 *
 * Also reads GITHUB_API_URL for GitHub Enterprise support.
 */
export const resolveGitHubCredentials: Effect.Effect<
  GitHubCredentials,
  Error,
  CommandExecutor.CommandExecutor
> = Effect.gen(function* () {
  const baseUrl = yield* Config.string("GITHUB_API_URL").pipe(
    Config.withDefault("https://api.github.com"),
    Effect.mapError(
      (e) => new Error(`Failed to read GITHUB_API_URL config: ${e}`),
    ),
  );

  // Try Config first (GITHUB_TOKEN from env or .env)
  const tokenFromConfig = yield* Config.string("GITHUB_TOKEN").pipe(
    Effect.option,
  );

  if (tokenFromConfig._tag === "Some") {
    return { token: tokenFromConfig.value, baseUrl };
  }

  // Fall back to `gh auth token` CLI
  const tokenFromCli = yield* getTokenFromGhCli.pipe(
    Effect.mapError(
      () =>
        new Error(
          "GitHub token not found. Set GITHUB_TOKEN environment variable or run `gh auth login`.",
        ),
    ),
  );

  return { token: tokenFromCli, baseUrl };
});

/**
 * Layer that provides GitHub credentials from Config or `gh` CLI fallback.
 *
 * Priority:
 * 1. `GITHUB_TOKEN` from Config (environment variable or .env)
 * 2. `gh auth token` CLI command (if user is logged in via `gh auth login`)
 *
 * Also reads:
 * - `GITHUB_API_URL` - Optional base URL for GitHub Enterprise
 *
 * @example
 * ```typescript
 * const program = myGitHubEffect.pipe(
 *   Effect.provide(GitHubCredentialsFromEnv)
 * );
 * ```
 */
export const GitHubCredentialsFromEnv: Layer.Layer<
  GitHubCredentialsTag,
  Error,
  CommandExecutor.CommandExecutor
> = Layer.effect(GitHubCredentialsTag, resolveGitHubCredentials);

/**
 * Creates a Layer that provides explicit GitHub credentials.
 *
 * @param credentials - The credentials to provide
 * @returns A Layer providing the credentials
 *
 * @example
 * ```typescript
 * const program = myGitHubEffect.pipe(
 *   Effect.provide(GitHubCredentialsFrom({
 *     token: "ghp_xxxxxxxxxxxx",
 *   }))
 * );
 * ```
 */
export const GitHubCredentialsFrom = (
  credentials: GitHubCredentials,
): Layer.Layer<GitHubCredentialsTag> =>
  Layer.succeed(GitHubCredentialsTag, {
    ...credentials,
    baseUrl: credentials.baseUrl ?? "https://api.github.com",
  });
