/**
 * Fragment configuration system.
 *
 * Provides:
 * - `cwd` placeholder for use in templates
 * - `FragmentConfig` Context.Tag for Effect-based access
 */
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

/**
 * Simple cwd placeholder for templates.
 * Use in template literals: `This runs in ${cwd}`
 */
export type cwd = typeof cwd;
export const cwd = { type: "cwd" } as const;

/**
 * Type guard for cwd placeholder.
 */
export const isCwd = (x: any): x is cwd => x?.type === "cwd";

/**
 * FragmentConfig service interface.
 */
export interface FragmentConfigService {
  readonly cwd: string;
}

/**
 * FragmentConfig Context.Tag for Effect-based access to configuration.
 */
export class FragmentConfig extends Context.Tag("FragmentConfig")<
  FragmentConfig,
  FragmentConfigService
>() {}

/**
 * Create a FragmentConfig layer with the given configuration.
 */
export const FragmentConfigLive = (config: FragmentConfigService) =>
  Layer.succeed(FragmentConfig, config);
