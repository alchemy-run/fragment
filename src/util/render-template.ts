/**
 * Template rendering utilities for displaying agent context.
 *
 * Extracted from context.ts for reuse in UI components.
 */

import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as S from "effect/Schema";
import * as yaml from "yaml";
import { FragmentConfig, isCwd } from "../config.ts";
import {
  isFragment,
  type Fragment,
  type RenderConfig,
} from "../fragment.ts";

// Re-export RenderConfig for backwards compatibility
export type { RenderConfig } from "../fragment.ts";

/**
 * A thunk is a function that returns a reference, enabling forward references.
 */
export type Thunk<T = unknown> = () => T;

/**
 * Checks if a value is a thunk (a function that returns a reference).
 * Thunks are zero-argument arrow functions that return references.
 * They are distinguished from other function-like constructs by:
 * - Not being fragments (agents, channels, groups, files, etc.)
 * - Not being Effect Schemas
 * - Having no arguments (length === 0)
 */
export const isThunk = (value: unknown): value is Thunk =>
  typeof value === "function" &&
  (value as Function).length === 0 &&
  !isFragment(value) &&
  !S.isSchema(value);

/**
 * Resolves a value that may be a thunk to its actual value.
 */
export const resolveThunk = <T>(value: T | Thunk<T>): T =>
  isThunk(value) ? value() : value;

/**
 * Create a version of a fragment with pre-resolved references.
 * This allows render.context functions to use type guards like isAgent directly.
 */
function resolveFragmentReferences<T extends Fragment<string, string, any[]>>(
  fragment: T,
): T {
  const resolvedRefs = fragment.references.map(resolveThunk);
  return Object.assign(Object.create(Object.getPrototypeOf(fragment)), fragment, {
    references: resolvedRefs,
  });
}

/**
 * Stringify a fragment using its render.context function.
 * Pre-resolves references so the context function can use type guards directly.
 */
function stringifyFragment(
  fragment: Fragment<string, string, any[]>,
  config?: RenderConfig,
): string {
  const frag = fragment as any;
  if (frag.render?.context) {
    // Pre-resolve references so context function can use type guards
    const resolved = resolveFragmentReferences(fragment);
    return frag.render.context(resolved, config);
  }
  // Fallback for fragments without custom render.context
  return `{${frag.type}:${frag.id}}`;
}

/**
 * Recursively serialize a value, replacing references with their string representations.
 * This produces a plain JSON-serializable object that can be passed to yaml.stringify.
 *
 * @param rawValue - The value to serialize
 * @param config - Optional config for resolving placeholders like cwd
 */
export function serialize(rawValue: unknown, config?: RenderConfig): unknown {
  // Resolve thunks first to get the actual value
  const value = resolveThunk(rawValue);

  // Handle cwd placeholder - resolve to actual cwd value
  if (isCwd(value)) return config?.cwd ?? process.cwd();

  // Handle any fragment type with self-describing render
  if (isFragment(value)) {
    return stringifyFragment(value, config);
  }

  // Handle primitives and functions
  if (value === null || value === undefined) return value;
  if (typeof value === "function") return String(value);
  if (typeof value !== "object") return value;

  // Handle Set - convert to array
  if (value instanceof Set)
    return Array.from(value).map((v) => serialize(v, config));

  // Handle Array
  if (Array.isArray(value)) return value.map((v) => serialize(v, config));

  // Handle plain objects only - for other object types (classes, Schemas, etc.),
  // fall back to string representation to avoid YAML serialization issues
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) {
    return String(value);
  }

  // Handle plain Object
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, serialize(v, config)]),
  );
}

/**
 * Stringifies a value for use in agent context.
 * - Primitives: converted to string
 * - Arrays/Sets/Objects: serialized to YAML
 * - Fragments: rendered using their render.context function
 * - Thunk: resolved to its actual value first
 *
 * @param rawValue - The value to stringify
 * @param config - Optional config for resolving placeholders like cwd
 */
export function stringify(rawValue: unknown, config?: RenderConfig): string {
  // Resolve thunks first to get the actual value
  const value = resolveThunk(rawValue);

  // Handle cwd placeholder - resolve to actual cwd value
  if (isCwd(value)) return config?.cwd ?? process.cwd();

  // Handle any fragment type with self-describing render
  if (isFragment(value)) {
    return stringifyFragment(value, config);
  }

  // Handle primitives
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);

  // Handle complex types with YAML
  const serialized = serialize(value, config);
  return "\n" + yaml.stringify(serialized).trimEnd();
}

/**
 * Renders a template string array with its references, replacing references with stringified values.
 *
 * @param template - The template string array
 * @param references - The interpolated values
 * @param config - Optional config for resolving placeholders like cwd
 */
export function renderTemplate(
  template: TemplateStringsArray,
  references: any[],
  config?: RenderConfig,
): string {
  let result = template[0];
  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    result += stringify(ref, config) + template[i + 1];
  }
  return result;
}

/**
 * Effect-based version of renderTemplate that resolves cwd from FragmentConfig.
 * Use this when rendering templates within an Effect context.
 */
export const renderTemplateEffect = (
  template: TemplateStringsArray,
  references: any[],
) =>
  Effect.gen(function* () {
    const config = yield* Effect.serviceOption(FragmentConfig).pipe(
      Effect.map(Option.getOrElse(() => ({ cwd: process.cwd() }))),
    );
    return renderTemplate(template, references, config);
  });

/**
 * Renders a fragment's template to a displayable string.
 * Works for any fragment type (Agent, Channel, GroupChat, Role, Group, etc.)
 */
export function renderFragmentTemplate(
  fragment: Fragment<string, string, any[]>,
  config?: RenderConfig,
): string {
  return renderTemplate(fragment.template, fragment.references, config);
}

// Backwards compatibility aliases
export const renderAgentTemplate = renderFragmentTemplate;
export const renderChannelTemplate = renderFragmentTemplate;
export const renderGroupChatTemplate = renderFragmentTemplate;
export const renderRoleTemplate = renderFragmentTemplate;
export const renderGroupTemplate = renderFragmentTemplate;
