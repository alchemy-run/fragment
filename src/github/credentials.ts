/**
 * GitHub credentials service for Effect-based authentication.
 *
 * Provides a Context.Tag for GitHub API authentication that can be
 * configured from environment variables or provided explicitly.
 */

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
  readonly baseUrl?: string;
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
 * Layer that provides GitHub credentials from environment variables.
 *
 * Reads from:
 * - `GITHUB_TOKEN` - Required personal access token
 * - `GITHUB_API_URL` - Optional base URL for GitHub Enterprise
 *
 * @example
 * ```typescript
 * const program = myGitHubEffect.pipe(
 *   Effect.provide(GitHubCredentialsFromEnv)
 * );
 * ```
 */
export const GitHubCredentialsFromEnv: Layer.Layer<GitHubCredentialsTag> =
  Layer.effect(
    GitHubCredentialsTag,
    Effect.sync(() => {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw new Error(
          "GITHUB_TOKEN environment variable is required for GitHub API access",
        );
      }
      return {
        token,
        baseUrl: process.env.GITHUB_API_URL ?? "https://api.github.com",
      };
    }),
  );

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
