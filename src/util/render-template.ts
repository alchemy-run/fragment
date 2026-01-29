/**
 * Template rendering utilities for displaying agent context.
 *
 * Extracted from context.ts for reuse in UI components.
 */

import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as S from "effect/Schema";
import * as yaml from "yaml";
import { isAgent, type Agent } from "../agent.ts";
import { isChannel, type Channel } from "../chat/channel.ts";
import { isGroupChat, type GroupChat } from "../chat/group-chat.ts";
import { FragmentConfig, isCwd } from "../config.ts";
import { isFile } from "../file/file.ts";
import {
  isGitHubRepository,
  isGitHubIssue,
  isGitHubPullRequest,
  isGitHubActions,
  isGitHubClone,
} from "../github/index.ts";
import { isInput } from "../input.ts";
import { isGroup, type Group } from "../org/group.ts";
import { isRole, type Role } from "../org/role.ts";
import { isOutput } from "../output.ts";
import { isTool } from "../tool/tool.ts";
import { isToolkit } from "../toolkit/toolkit.ts";

/**
 * Check if a value is any GitHub fragment type.
 */
export const isGitHubFragment = (value: unknown): boolean =>
  isGitHubRepository(value) ||
  isGitHubIssue(value) ||
  isGitHubPullRequest(value) ||
  isGitHubActions(value) ||
  isGitHubClone(value);

/**
 * Configuration for template rendering.
 */
export interface RenderConfig {
  readonly cwd: string;
}

/**
 * A thunk is a function that returns a reference, enabling forward references.
 */
export type Thunk<T = unknown> = () => T;

/**
 * Checks if a value is a thunk (a function that returns a reference).
 * Thunks are zero-argument arrow functions that return references.
 * They are distinguished from other function-like constructs by:
 * - Not being agents, channels, groups, files, toolkits, tools, inputs, outputs, GitHub fragments, or Effect Schemas
 * - Having no arguments (length === 0)
 */
export const isThunk = (value: unknown): value is Thunk =>
  typeof value === "function" &&
  (value as Function).length === 0 &&
  !isAgent(value) &&
  !isChannel(value) &&
  !isGroupChat(value) &&
  !isRole(value) &&
  !isGroup(value) &&
  !isFile(value) &&
  !isToolkit(value) &&
  !isTool(value) &&
  !isInput(value) &&
  !isOutput(value) &&
  !isGitHubFragment(value) &&
  !S.isSchema(value);

/**
 * Resolves a value that may be a thunk to its actual value.
 */
export const resolveThunk = <T>(value: T | Thunk<T>): T =>
  isThunk(value) ? value() : value;

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

  // Handle Agent, Channel, GroupChat, Role, Group, File, GitHub, Toolkit, Tool, Input, Output references
  // These can be classes (functions) so check before typeof checks
  if (isAgent(value)) return `@${value.id}`;
  if (isChannel(value)) return `#${value.id}`;
  if (isGroupChat(value)) {
    // Extract agent members from references and format as @{member1, member2}
    const members = value.references
      .filter((ref: unknown) => isAgent(resolveThunk(ref)))
      .map((ref: unknown) => (resolveThunk(ref) as Agent).id);
    return members.length > 0 ? `@{${members.join(", ")}}` : `@{${value.id}}`;
  }
  if (isRole(value)) return `&${value.id}`;
  if (isGroup(value)) {
    // Extract agent members from references and format as %{member1, member2}
    const members = value.references
      .filter((ref: unknown) => isAgent(resolveThunk(ref)))
      .map((ref: unknown) => (resolveThunk(ref) as Agent).id);
    return members.length > 0 ? `%{${members.join(", ")}}` : `%${value.id}`;
  }
  if (isFile(value)) {
    const filename = value.id.split("/").pop() || value.id;
    return `[${filename}](${value.id})`;
  }
  // GitHub fragments - use specific icons for each type
  if (isGitHubRepository(value)) {
    const props = value as any;
    return `📦${props.owner ?? ""}/${props.repo ?? value.id}`;
  }
  if (isGitHubIssue(value)) {
    const props = value as any;
    if (props.number) {
      return `🐛${props.owner ?? ""}/${props.repo ?? ""}#${props.number}`;
    }
    return `🐛${props.owner ?? ""}/${props.repo ?? value.id}`;
  }
  if (isGitHubPullRequest(value)) {
    const props = value as any;
    if (props.number) {
      return `🔀${props.owner ?? ""}/${props.repo ?? ""}#${props.number}`;
    }
    return `🔀${props.owner ?? ""}/${props.repo ?? value.id}`;
  }
  if (isGitHubActions(value)) {
    const props = value as any;
    return `⚡${props.owner ?? ""}/${props.repo ?? value.id}`;
  }
  if (isGitHubClone(value)) {
    const props = value as any;
    return `📂${props.path ?? value.id}`;
  }
  if (isToolkit(value)) return `🧰${value.id}`;
  if (isTool(value)) return `🛠️${value.id}`;
  if (isInput(value)) return `\${${value.id}}`;
  if (isOutput(value)) return `^{${value.id}}`;

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
 * - Agent: @{id} reference link
 * - Channel: #{id} channel reference
 * - GroupChat: @{member1, member2} group chat reference
 * - Role: &{id} role reference
 * - Group: %{member1, member2} or %{id} group reference
 * - File: [filename](path) markdown link
 * - Toolkit: 🧰{id}
 * - Tool: 🛠️{id}
 * - Input: ${id}
 * - Output: ^{id}
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

  // Handle Agent, Channel, GroupChat, Role, Group, File, GitHub, Toolkit, Tool, Input, Output references
  if (isAgent(value)) return `@${value.id}`;
  if (isChannel(value)) return `#${value.id}`;
  if (isGroupChat(value)) {
    // Extract agent members from references and format as @{member1, member2}
    const members = value.references
      .filter((ref: unknown) => isAgent(resolveThunk(ref)))
      .map((ref: unknown) => (resolveThunk(ref) as Agent).id);
    return members.length > 0 ? `@{${members.join(", ")}}` : `@{${value.id}}`;
  }
  if (isRole(value)) return `&${value.id}`;
  if (isGroup(value)) {
    // Extract agent members from references and format as %{member1, member2}
    const members = value.references
      .filter((ref: unknown) => isAgent(resolveThunk(ref)))
      .map((ref: unknown) => (resolveThunk(ref) as Agent).id);
    return members.length > 0 ? `%{${members.join(", ")}}` : `%${value.id}`;
  }
  if (isFile(value)) {
    const filename = value.id.split("/").pop() || value.id;
    return `[${filename}](${value.id})`;
  }
  // GitHub fragments - use specific icons for each type
  if (isGitHubRepository(value)) {
    const props = value as any;
    return `📦${props.owner ?? ""}/${props.repo ?? value.id}`;
  }
  if (isGitHubIssue(value)) {
    const props = value as any;
    if (props.number) {
      return `🐛${props.owner ?? ""}/${props.repo ?? ""}#${props.number}`;
    }
    return `🐛${props.owner ?? ""}/${props.repo ?? value.id}`;
  }
  if (isGitHubPullRequest(value)) {
    const props = value as any;
    if (props.number) {
      return `🔀${props.owner ?? ""}/${props.repo ?? ""}#${props.number}`;
    }
    return `🔀${props.owner ?? ""}/${props.repo ?? value.id}`;
  }
  if (isGitHubActions(value)) {
    const props = value as any;
    return `⚡${props.owner ?? ""}/${props.repo ?? value.id}`;
  }
  if (isGitHubClone(value)) {
    const props = value as any;
    return `📂${props.path ?? value.id}`;
  }
  if (isToolkit(value)) return `🧰${value.id}`;
  if (isTool(value)) return `🛠️${value.id}`;
  if (isInput(value)) return `\${${value.id}}`;
  if (isOutput(value)) return `^{${value.id}}`;

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
 * Renders an agent's template to a displayable string.
 */
export function renderAgentTemplate(agent: Agent, config?: RenderConfig): string {
  return renderTemplate(agent.template, agent.references, config);
}

/**
 * Renders a channel's template to a displayable string.
 */
export function renderChannelTemplate(channel: Channel, config?: RenderConfig): string {
  return renderTemplate(channel.template, channel.references, config);
}

/**
 * Renders a group chat's template to a displayable string.
 */
export function renderGroupChatTemplate(groupChat: GroupChat, config?: RenderConfig): string {
  return renderTemplate(groupChat.template, groupChat.references, config);
}

/**
 * Renders a role's template to a displayable string.
 */
export function renderRoleTemplate(role: Role, config?: RenderConfig): string {
  return renderTemplate(role.template, role.references, config);
}

/**
 * Renders a group's template to a displayable string.
 */
export function renderGroupTemplate(group: Group, config?: RenderConfig): string {
  return renderTemplate(group.template, group.references, config);
}
