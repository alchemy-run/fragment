import { defineFragment, type Fragment } from "../fragment.ts";
import { isTool, type Tool } from "../tool/tool.ts";
import { collectFlat } from "../util/collect-references.ts";

export type IToolkit<
  ID extends string,
  Tools extends Tool[],
  References extends any[] = any[],
> = Fragment<"toolkit", ID, References> & {
  readonly tools: Tools;
};

export type Toolkit<
  Name extends string = string,
  Tools extends Tool[] = Tool[],
  References extends any[] = any[],
> = IToolkit<Name, Tools, References> & {
  new (_: never): IToolkit<Name, Tools, References>;
};

const ToolkitBuilder = defineFragment("toolkit")<{}>({
  render: {
    context: (toolkit: Toolkit) => `🧰${toolkit.id}`,
  },
  get tools(): Tool[] {
    return collectFlat(
      (this as unknown as Fragment<"toolkit", string, any[]>).references,
      isTool,
    );
  },
});

/**
 * Type guard for Toolkit fragments.
 */
export const isToolkit = ToolkitBuilder.is<Toolkit>;

/**
 * Creates a Toolkit fragment that groups tools together.
 *
 * @example
 * ```typescript
 * class CodingTools extends Toolkit("coding")`
 *   ${ReadTool}
 *   ${WriteTool}
 *   ${GrepTool}
 * ` {}
 *
 * // Access tools lazily
 * CodingTools.tools // => [ReadTool, WriteTool, GrepTool]
 * ```
 */
export const Toolkit = <ID extends string>(id: ID) =>
  ToolkitBuilder(id) as unknown as <const References extends any[]>(
    template: TemplateStringsArray,
    ...references: References
  ) => Toolkit<ID, ExtractTools<References>, References>;

type ExtractTools<
  References extends any[],
  Tools extends Tool[] = [],
> = References extends [infer x, ...infer xs]
  ? x extends Tool
    ? ExtractTools<xs, [...Tools, x]>
    : ExtractTools<xs, Tools>
  : Tools;
