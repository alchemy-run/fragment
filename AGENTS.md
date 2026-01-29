# Fragment

Fragment is a TypeScript framework for building AI agent systems with composable, template-based entities.

## Core Concepts

- **Fragment** - A named entity defined via template literals with references to other fragments
- **Agent** - An AI agent that can be spawned, communicate, and use tools
- **Channel** - A persistent communication space for agent collaboration
- **GroupChat** - An ad-hoc group chat for specific topics
- **Toolkit** - A collection of tools grouped together
- **Tool** - A callable function with typed inputs/outputs
- **File** - A file reference with language and description
- **Group** - An organizational unit containing agents
- **Role** - A collection of permissions/tools that agents can inherit

## Building Custom Fragments

Each fragment type follows a consistent pattern with three key components:

1. **Interface** - Extends `Fragment<Type, ID, References>` with custom properties
2. **Builder** - Uses `defineFragment` to create the factory
3. **Type Guard** - Uses the builder's `.is` method

### File Structure

```
src/
  {domain}/
    {fragment}.ts       # Fragment definition
    tui/
      sidebar.tsx       # Optional sidebar component
      content.tsx       # Optional content view component
```

### Step 1: Define the Interface

The interface extends `Fragment` and declares custom properties that instances will have:

```typescript
import { defineFragment, type Fragment } from "../fragment.ts";

/**
 * MyFragment type - description of what this fragment represents.
 * Extends Fragment for template support with custom properties.
 */
export interface MyFragment<
  ID extends string = string,
  References extends any[] = any[],
> extends Fragment<"my-fragment", ID, References> {
  // Custom properties that instances will have
  readonly customProp: string;
  readonly optionalProp?: number;
}
```

**Key points:**
- The first type parameter to `Fragment<>` is the fragment type string (e.g., `"my-fragment"`)
- `ID` captures the literal string type of the fragment's id
- `References` captures the tuple of referenced fragments
- Custom properties should be `readonly`

### Step 2: Define Props Interface (Optional)

If your fragment needs constructor-time configuration:

```typescript
/**
 * Properties for creating a MyFragment.
 */
export interface MyFragmentProps {
  /**
   * Description of the property.
   */
  readonly customProp: string;

  /**
   * Optional property with default.
   * @default "default-value"
   */
  readonly optionalProp?: string;
}
```

### Step 3: Create the Fragment Builder

Use `defineFragment` to create the fragment factory:

```typescript
export const MyFragment = defineFragment("my-fragment")<MyFragmentProps>({
  render: {
    // How to render in context (system prompts, etc.)
    context: (frag: MyFragment) => {
      return `🔷${frag.customProp}`;
    },
    // TUI configuration (optional)
    tui: {
      sidebar: MyFragmentSidebar,  // Optional sidebar component
      content: MyFragmentContent,   // Optional content component
      focusable: true,              // Can this be focused/selected?
      icon: "🔷",                   // Icon for sidebar
      sectionTitle: "My Fragments", // Section header in sidebar
    },
  },
  // Custom getters/methods (optional)
  get derivedValue(): string {
    const self = this as unknown as MyFragment;
    return `computed-${self.customProp}`;
  },
});
```

### Step 4: Add Type Guard

Export a type guard for runtime type checking:

```typescript
/**
 * Type guard for MyFragment entities.
 */
export const isMyFragment = MyFragment.is<MyFragment>;
```

### Step 5: Export from Index

Add exports to the domain's index file:

```typescript
// src/{domain}/index.ts
export * from "./my-fragment.ts";
```

## Complete Example

Here's a complete example of a custom fragment:

```typescript
// src/github/repository.ts
import { defineFragment, type Fragment } from "../fragment.ts";
import { GitHubRepositorySidebar } from "./tui/sidebar.tsx";
import { GitHubRepositoryContent } from "./tui/content.tsx";

/**
 * GitHub repository properties for the fragment.
 */
export interface RepositoryProps {
  /**
   * Repository owner (user or organization).
   */
  readonly owner: string;

  /**
   * Repository name.
   */
  readonly repo: string;

  /**
   * Default branch name.
   * @default "main"
   */
  readonly defaultBranch?: string;
}

/**
 * GitHubRepository type - a fragment representing a GitHub repository.
 * Extends Fragment for template support with owner and repo properties.
 */
export interface GitHubRepository<
  ID extends string = string,
  References extends any[] = any[],
> extends Fragment<"github-repository", ID, References> {
  readonly owner: string;
  readonly repo: string;
  readonly defaultBranch: string;
}

export const GitHubRepository = defineFragment("github-repository")<RepositoryProps>({
  render: {
    context: (repo: GitHubRepository) => {
      return `📦${repo.owner}/${repo.repo}`;
    },
    tui: {
      sidebar: GitHubRepositorySidebar,
      content: GitHubRepositoryContent,
      focusable: false,
      icon: "📦",
      sectionTitle: "Repositories",
    },
  },
});

/**
 * Type guard for GitHub Repository fragments.
 */
export const isGitHubRepository = GitHubRepository.is;
```

### Usage

```typescript
// Define a repository fragment
class CloudflareSDK extends GitHubRepository("cloudflare-sdk", {
  owner: "cloudflare",
  repo: "cloudflare-typescript",
})`
# Cloudflare TypeScript SDK

Official SDK for the Cloudflare API.
` {}

// Access properties
CloudflareSDK.owner    // "cloudflare"
CloudflareSDK.repo     // "cloudflare-typescript"
CloudflareSDK.id       // "cloudflare-sdk"

// Use in other fragments
class SDKAgent extends Agent("sdk-agent")`
An agent that works with ${CloudflareSDK}.
` {}
```

## TUI Implementation

### Sidebar Component

Sidebar components render a list of fragments in the sidebar:

```typescript
// src/{domain}/tui/sidebar.tsx
import type { JSX } from "solid-js";
import { For, Show } from "solid-js";
import type { MyFragment } from "../my-fragment.ts";

export function MyFragmentSidebar(props: {
  fragments: MyFragment[];
  selectedId?: string;
  onSelect?: (id: string, type: string) => void;
}): JSX.Element {
  return (
    <box flexDirection="column">
      <For each={props.fragments}>
        {(fragment) => (
          <text
            onClick={() => props.onSelect?.(fragment.id, "my-fragment")}
            color={props.selectedId === fragment.id ? "blue" : undefined}
          >
            🔷 {fragment.id}
          </text>
        )}
      </For>
    </box>
  );
}
```

### Content Component

Content components render when a fragment is selected:

```typescript
// src/{domain}/tui/content.tsx
import type { JSX } from "solid-js";
import type { ContentViewProps } from "../../fragment.ts";
import type { MyFragment } from "../my-fragment.ts";

export function MyFragmentContent(
  props: ContentViewProps<MyFragment>
): JSX.Element {
  return (
    <box flexDirection="column" padding={1}>
      <text bold>Fragment: {props.fragment.id}</text>
      <text>Custom Prop: {props.fragment.customProp}</text>
      <Show when={props.focused}>
        <text dimColor>Press 'q' to go back</text>
      </Show>
    </box>
  );
}
```

### ContentViewProps

The content component receives these props:

```typescript
interface ContentViewProps<T> {
  fragment: T;       // The fragment being displayed
  focused: boolean;  // Whether the view can receive keyboard input
  onBack: () => void; // Callback to return focus to sidebar
  onExit: () => void; // Callback to exit the application
}
```

## Context Rendering

The `context` function determines how a fragment appears in system prompts and other text contexts:

```typescript
render: {
  context: (frag: MyFragment) => {
    // Return a string representation
    return `🔷${frag.id}`;
  },
}
```

**Common patterns:**
- `@${agent.id}` - For agents (mentions)
- `#${channel.id}` - For channels (hashtags)
- `📦${repo.owner}/${repo.repo}` - For repositories
- `[${filename}](${file.id})` - For files (markdown links)

## Custom Methods and Getters

Add computed properties or methods using getters in the fragment definition:

```typescript
const ToolkitBuilder = defineFragment("toolkit")<{}>({
  render: {
    context: (toolkit: Toolkit) => `🧰${toolkit.id}`,
  },
  // Custom getter that computes tools from references
  get tools(): Tool[] {
    const self = this as unknown as Fragment<"toolkit", string, any[]>;
    return collectFlat(self.references, isTool);
  },
});
```

## Fragment Checklist

When creating a new fragment type:

- [ ] Define the interface extending `Fragment<Type, ID, References>`
- [ ] Include all custom properties in the interface
- [ ] Create props interface if constructor-time config is needed
- [ ] Use `defineFragment` with correct type string
- [ ] Implement `context` render function
- [ ] Add TUI config if sidebar/content views needed
- [ ] Export type guard using `.is<Interface>`
- [ ] Add JSDoc comments for all interfaces and properties
- [ ] Update domain index.ts with exports

## Testing

Test fragments using the standard test patterns:

```typescript
import { describe, test, expect } from "vitest";
import { MyFragment, isMyFragment } from "../src/my-fragment.ts";

describe("MyFragment", () => {
  test("creates fragment with correct properties", () => {
    class TestFragment extends MyFragment("test", {
      customProp: "value",
    })`Template content` {}

    expect(TestFragment.id).toBe("test");
    expect(TestFragment.customProp).toBe("value");
    expect(TestFragment.type).toBe("my-fragment");
    expect(isMyFragment(TestFragment)).toBe(true);
  });
});
```
