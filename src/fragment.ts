import type { JSX } from "solid-js";

/**
 * Configuration for template rendering.
 */
export interface RenderConfig {
  readonly cwd: string;
}

/**
 * Props passed to custom content view components.
 */
export interface ContentViewProps<T = unknown> {
  /**
   * The fragment being displayed.
   */
  fragment: T;

  /**
   * Whether the content view is focused (can receive keyboard input).
   */
  focused: boolean;

  /**
   * Callback to return focus to the sidebar.
   */
  onBack: () => void;

  /**
   * Callback to exit the application.
   */
  onExit: () => void;
}

/**
 * TUI rendering configuration for a fragment type.
 */
export interface FragmentRenderTui<T = unknown> {
  /**
   * Sidebar section component for this fragment type.
   * Receives all fragments of this type and renders a list.
   */
  sidebar?: (props: {
    fragments: T[];
    selectedId?: string;
    onSelect?: (id: string, type: string) => void;
  }) => JSX.Element;

  /**
   * Content view component when this fragment is selected.
   * Replaces the default ChatView for this fragment type.
   * If not provided, falls back to ChatView for chat-compatible types.
   */
  content?: (props: ContentViewProps<T>) => JSX.Element;

  /**
   * Chat message renderer for this fragment type.
   * Renders the fragment content in the chat view.
   */
  chat?: (props: { fragment: T; content: string }) => JSX.Element;

  /**
   * Whether this fragment type supports focus mode.
   * If false, pressing Enter won't focus the content.
   * @default true
   */
  focusable?: boolean;

  /**
   * Icon for sidebar items and mentions.
   * Can be an emoji or unicode character.
   */
  icon?: string;

  /**
   * Color theme for this fragment type.
   * Used for syntax highlighting in mentions.
   */
  color?: string;

  /**
   * Section title for the sidebar.
   * Defaults to the fragment type name.
   */
  sectionTitle?: string;
}

/**
 * Fragment with pre-resolved references.
 * Thunks in the references array have been resolved to their actual values.
 */
export type ResolvedFragment<T> = T extends Fragment<infer Type, infer ID, infer _Refs>
  ? Omit<T, "references"> & Fragment<Type, ID, unknown[]>
  : T;

/**
 * Unified render configuration for a fragment type.
 * Handles both context (text) rendering and TUI rendering.
 */
export interface FragmentRender<T = unknown> {
  /**
   * Render fragment as text for agent context/templates.
   * Used when interpolating fragment references in template strings.
   *
   * The fragment's references array is pre-resolved - all thunks have been
   * called so you can use type guards like `isAgent`, `isChannel`, etc. directly.
   *
   * @example
   * ```typescript
   * // Agent renders as @id
   * context: (agent) => `@${agent.id}`
   *
   * // GroupChat renders as @{member1, member2}
   * context: (groupChat) => {
   *   const members = groupChat.references.filter(isAgent).map(a => a.id);
   *   return members.length > 0 ? `@{${members.join(", ")}}` : `@{${groupChat.id}}`;
   * }
   * ```
   */
  context?: (fragment: ResolvedFragment<T>, config?: RenderConfig) => string;

  /**
   * TUI rendering configuration.
   */
  tui?: FragmentRenderTui<T>;
}

export interface Fragment<
  Type extends string,
  Name extends string,
  References extends any[],
> {
  readonly type: Type;
  /**
   * The identifier for this fragment.
   * Uses `id` instead of `name` to avoid conflicts with JavaScript's
   * built-in `name` property on classes/functions.
   */
  readonly id: Name;
  readonly template: TemplateStringsArray;
  readonly references: References;
}

/**
 * The class type returned by fragment builders.
 * Structurally compatible with user-defined interfaces that extend Fragment.
 */
export interface FragmentClass<
  Type extends string,
  ID extends string,
  References extends any[],
  Extra extends object = {},
  Render extends FragmentRender<any> | undefined = undefined,
> extends Fragment<Type, ID, References> {
  new (_: never): Fragment<Type, ID, References> & Extra;
  /**
   * Render configuration for this fragment type.
   * Used for context rendering and TUI rendering.
   */
  readonly render?: Render;
}

/**
 * Check if a value matches the Fragment shape.
 */
export function isFragment(
  value: unknown,
): value is Fragment<string, string, any[]> {
  return (
    typeof value === "function" &&
    "type" in value &&
    typeof value.type === "string" &&
    "id" in value &&
    "template" in value &&
    "references" in value
  );
}

/**
 * Options for defining a fragment with render configuration.
 * All properties are added as statics on the fragment class.
 * Supports methods and getters via Object.defineProperties.
 */
export interface DefineFragmentOptions {
  /**
   * Render configuration for this fragment type.
   * Defines how the fragment renders in context and TUI.
   */
  render?: FragmentRender<any>;
}

/**
 * A fragment builder function with associated metadata.
 */
export interface FragmentBuilder<
  Type extends string,
  Extra extends object,
  Render extends FragmentRender<any> | undefined,
> {
  <ID extends string, Props extends Extra>(
    id: ID,
    ...args: keyof Extra extends never ? [] : [props: Props]
  ): <References extends any[]>(
    template: TemplateStringsArray,
    ...references: References
  ) => FragmentClass<Type, ID, References, Props, Render>;

  /**
   * Type guard to check if a value is this fragment type.
   */
  is: <T extends Fragment<Type, string, any[]>>(x: any) => x is T;

  /**
   * The fragment type identifier.
   */
  readonly type: Type;

  /**
   * Render configuration for this fragment type.
   */
  readonly render: Render;
}

/**
 * Factory that creates a fragment builder with optional extra properties and render configuration.
 *
 * @example
 * ```typescript
 * // Basic usage (Agent, Channel, Group pattern)
 * export const Channel = defineFragment("channel")({
 *   render: { context: (c) => `#${c.id}` }
 * });
 * // Usage: Channel("my-channel")`description`
 *
 * // With extra static properties (File pattern)
 * export const File = defineFragment("file")<{ language: string }>({
 *   render: { context: (f) => `[${f.id}](${f.id})` }
 * });
 * // Usage: File("my-file", { language: "typescript" as const })`description`
 *
 * // With TUI extensions (GitHub pattern)
 * export const GitHubRepository = defineFragment("github-repository")<RepositoryProps>({
 *   render: {
 *     context: (frag) => `📦${frag.owner}/${frag.repo}`,
 *     tui: {
 *       sidebar: GitHubRepoSidebar,
 *       icon: "📦",
 *       sectionTitle: "Repositories",
 *     }
 *   }
 * });
 * // Usage: GitHubRepository("my-repo", { owner: "sam", repo: "alchemy" })`description`
 * ```
 */
export const defineFragment =
  <Type extends string>(type: Type) =>
  <
    Extra extends object = {},
    const Options extends DefineFragmentOptions & Record<string, unknown> = {},
  >(
    options?: Options,
  ): FragmentBuilder<Type, Extra, Options["render"]> => {
    type Render = Options["render"];

    const builder = <ID extends string, Props extends Extra>(
      id: ID,
      ...args: keyof Extra extends never ? [] : [props: Props]
    ) => {
      const props = (args[0] ?? {}) as Props;
      return <References extends any[]>(
        template: TemplateStringsArray,
        ...references: References
      ): FragmentClass<Type, ID, References, Props, Render> => {
        const cls = class {
          static readonly type = type;
          static readonly id = id;
          static readonly template = template;
          static readonly references = references;
          constructor(_: never) {}
        };
        // Copy all options as statics (preserves getters/methods)
        if (options) {
          Object.defineProperties(
            cls,
            Object.getOwnPropertyDescriptors(options),
          );
        }
        // Copy per-instance props
        Object.assign(cls, props);
        return cls as unknown as FragmentClass<Type, ID, References, Props, Render>;
      };
    };

    builder.is = <
      T extends Fragment<Type, string, any[]> = Fragment<Type, string, any[]>,
    >(
      x: any,
    ): x is T => x?.type === type;

    builder.type = type;
    builder.render = options?.render as Render;

    return builder as FragmentBuilder<Type, Extra, Render>;
  };
