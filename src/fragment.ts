import type { JSX } from "solid-js";

/**
 * TUI extension configuration for a fragment type.
 * Allows fragments to define how they render in the sidebar and chat.
 */
export interface FragmentTuix<T = unknown> {
  /**
   * Sidebar section component for this fragment type.
   * Receives all fragments of this type and renders a list.
   */
  sidebar?: (props: { fragments: T[] }) => JSX.Element;

  /**
   * Chat message renderer for this fragment type.
   * Renders the fragment content in the chat view.
   */
  chat?: (props: { fragment: T; content: string }) => JSX.Element;

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
  Tuix extends FragmentTuix<any> | undefined = undefined,
> extends Fragment<Type, ID, References> {
  new (_: never): Fragment<Type, ID, References> & Extra;
  /**
   * TUI extension configuration for this fragment type.
   * Used by the TUI to render sidebar sections and chat content.
   */
  readonly tuix?: Tuix;
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
 * Options for defining a fragment with TUI extensions.
 */
export interface DefineFragmentOptions<Tuix extends FragmentTuix<any>> {
  /**
   * TUI extension configuration for this fragment type.
   * Defines how the fragment renders in sidebar and chat.
   */
  tuix?: Tuix;
}

/**
 * A fragment builder function with associated metadata.
 */
export interface FragmentBuilder<
  Type extends string,
  Extra extends object,
  Tuix extends FragmentTuix<any> | undefined,
> {
  <ID extends string, Props extends Extra>(
    id: ID,
    ...args: keyof Extra extends never ? [] : [props: Props]
  ): <References extends any[]>(
    template: TemplateStringsArray,
    ...references: References
  ) => FragmentClass<Type, ID, References, Props, Tuix>;

  /**
   * Type guard to check if a value is this fragment type.
   */
  is: <T extends Fragment<Type, string, any[]>>(x: any) => x is T;

  /**
   * The fragment type identifier.
   */
  readonly type: Type;

  /**
   * TUI extension configuration for this fragment type.
   */
  readonly tuix: Tuix;
}

/**
 * Factory that creates a fragment builder with optional extra properties and TUI extensions.
 *
 * @example
 * ```typescript
 * // Basic usage (Agent, Channel, Group pattern)
 * export const Channel = defineFragment("channel")();
 * // Usage: Channel("my-channel")`description`
 *
 * // With extra static properties (File pattern)
 * export const File = defineFragment("file")<{ language: string }>();
 * // Usage: File("my-file", { language: "typescript" as const })`description`
 *
 * // With TUI extensions (GitHub pattern)
 * export const GitHubRepository = defineFragment("github-repository")({
 *   tuix: {
 *     sidebar: GitHubRepoSidebar,
 *     icon: "📦",
 *     sectionTitle: "GitHub Repositories",
 *   }
 * });
 * // Usage: GitHubRepository("my-repo", { owner: "sam", repo: "alchemy" })`description`
 * ```
 */
export const defineFragment =
  <Type extends string>(type: Type) =>
  <
    Extra extends object = {},
    Tuix extends FragmentTuix<any> | undefined = undefined,
  >(
    options?: DefineFragmentOptions<NonNullable<Tuix>>,
  ): FragmentBuilder<Type, Extra, Tuix> => {
    const tuix = options?.tuix as Tuix;

    const builder = <ID extends string, Props extends Extra>(
      id: ID,
      ...args: keyof Extra extends never ? [] : [props: Props]
    ) => {
      const props = (args[0] ?? {}) as Props;
      return <References extends any[]>(
        template: TemplateStringsArray,
        ...references: References
      ): FragmentClass<Type, ID, References, Props, Tuix> => {
        const cls = class {
          static readonly type = type;
          static readonly id = id;
          static readonly template = template;
          static readonly references = references;
          static readonly tuix = tuix;
          constructor(_: never) {}
        };
        Object.assign(cls, props);
        return cls as unknown as FragmentClass<Type, ID, References, Props, Tuix>;
      };
    };

    builder.is = <
      T extends Fragment<Type, string, any[]> = Fragment<Type, string, any[]>,
    >(
      x: any,
    ): x is T => x?.type === type;

    builder.type = type;
    builder.tuix = tuix;

    return builder as FragmentBuilder<Type, Extra, Tuix>;
  };
