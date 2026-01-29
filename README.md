# fragment

Build AI agent organizations by composing fragments.

## CLI

```bash
# Launch TUI with default config (./fragment.config.ts)
fragment

# Use a custom config file
fragment ./path/to/config.ts

# Run from another directory
fragment --cwd ../my-project
```

## What is a Fragment?

A **fragment** is the core building block — a typed, composable unit defined using template literals. Agents, groups, roles, channels, files, and tools are all fragments. By embedding fragments within each other using `${Reference}`, you compose them into a complete organization:

```typescript
import { Agent, Org, Chat } from "fragment";

// Each of these is a fragment
class Alice extends Agent("alice")`Senior engineer` {}
class Bob extends Agent("bob")`Junior engineer` {}

// Fragments compose into larger structures
class Engineering extends Org.Group("engineering")`
Team members: ${Alice}, ${Bob}
` {}

class EngineeringChannel extends Chat.Channel("engineering")`
Discussions for ${Engineering}
` {}

// The root fragment ties everything together
export default class TechLead extends Agent("tech-lead")`
Manages ${Engineering} via ${EngineeringChannel}
` {}
```

Every fragment has:
- **type** — What kind of fragment (`agent`, `group`, `role`, `channel`, `file`, etc.)
- **id** — A unique identifier
- **template** — The template literal content (becomes context/prompts)
- **references** — Other fragments embedded via `${...}`

## Features

- **Composable fragments** — Everything is a fragment; compose them into organizations
- **Organizational modeling** — Groups, Roles, Channels, and GroupChats model real team dynamics
- **Typed tools** — Effect-based handlers with schema-validated inputs/outputs
- **File references** — Reference folders, markdown, TypeScript, and other files as fragments
- **TUI interface** — Interactive terminal UI for chatting with agents

## Installation

```bash
bun add fragment effect @effect/ai @effect/platform
```

## Quick Start

Create a `fragment.config.ts` with a default Agent export:

```typescript
import { Agent } from "fragment";

export default class Assistant extends Agent("assistant")`
# Assistant

A helpful AI assistant.

## Responsibilities
- Answer questions
- Help with tasks
` {}
```

Launch the TUI:

```bash
bunx fragment
```

## Agents

Agents are fragments that represent AI entities. The template becomes the agent's system prompt:

```typescript
import { Agent } from "fragment";

class CodeReviewer extends Agent("code-reviewer")`
# Code Reviewer

## Responsibilities
- Review pull requests for bugs and style issues
- Suggest improvements
- Approve or request changes

## Standards
- Follow the project style guide
- Check for security vulnerabilities
- Verify test coverage
` {}
```

### Agent References

Agents can reference other agents. When you splice `${Agent}` into another agent:
- The referenced agent becomes **discoverable** — the parent can send messages to it
- The reference appears in the parent's **system prompt** with the agent's ID
- This creates an organizational hierarchy for coordination

```typescript
class TechLead extends Agent("tech-lead")`
# Tech Lead

## Direct Reports
- ${CodeReviewer}
- ${Architect}

## Responsibilities
- Coordinate technical work
- Make architectural decisions
- Mentor team members
` {}
```

The TechLead can now send messages to CodeReviewer and Architect using their IDs.

## Tools

Tools are fragments that represent callable functions. When you splice `${input}` and `${output}` into a tool:
- Inputs become **typed parameters** the tool accepts
- Outputs define the **return type** with schema validation
- The template becomes the tool's **description** for the AI

```typescript
import { Tool, input, output } from "fragment";
import * as S from "effect/Schema";
import * as Effect from "effect/Effect";

const filePath = input("path")`The file path to read`;
const content = output("content", S.String);

const readFile = Tool("read-file")`
Read a file at ${filePath} and return its ${content}
`(function* ({ path }) {
  const fs = yield* FileSystem;
  const data = yield* fs.readFileString(path);
  return { content: data };
});
```

The tool now accepts `{ path: string }` and returns `{ content: string }`.

### Tool Inputs

Inputs define the parameters a tool accepts:

```typescript
import { input } from "fragment";
import * as S from "effect/Schema";

// String input (default)
const message = input("message")`The message to send`;

// Typed input
const count = input("count", S.Number)`Number of items`;

// Enum input
const priority = input("priority", S.Literal("low", "medium", "high"))`Task priority`;
```

### Tool Outputs

Outputs define what a tool returns:

```typescript
import { output } from "fragment";
import * as S from "effect/Schema";

// String output
const result = output("result", S.String);

// Structured output
const user = output("user", S.Struct({
  id: S.String,
  name: S.String,
  email: S.String,
}));
```

## Toolkits

Toolkits are fragments that bundle tools. When you splice `${tool}` into a toolkit:
- The tool becomes **part of the bundle**
- Agents or roles that reference the toolkit gain access to all bundled tools

```typescript
import { Toolkit } from "fragment";
import { bash, read, write, edit } from "fragment/tool";

class Coding extends Toolkit.Toolkit("Coding")`
Tools for reading, writing, and editing code:

- ${bash}  - Execute shell commands
- ${read}  - Read file contents
- ${write} - Create new files
- ${edit}  - Edit existing files
` {}
```

Any agent with `${Coding}` in their template gains bash, read, write, and edit tools.

## Files

Files are fragments that reference project files and folders. When you splice `${File}` into an agent:
- The file's **path and description** become part of the agent's context
- Agents understand the project structure and can reference these files

```typescript
import { File } from "fragment";

// Folder reference
class Docs extends File.Folder`docs/``
Documentation root folder.
` {}

// Markdown file
class Readme extends File.Markdown`${Docs}/README.md``
Project README with setup instructions.
` {}

// TypeScript file
class Config extends File.TypeScript`src/config.ts``
Application configuration.
` {}
```

### Nested File References

When you splice `${File}` into another file's path:
- The parent file's path is **interpolated** into the child's path
- This creates a hierarchy of file references

```typescript
class Src extends File.Folder`src/``
Source code directory.
` {}

class Components extends File.Folder`${Src}/components/``
React components.
` {}

class Button extends File.TypeScript`${Components}/Button.tsx``
Reusable button component.
` {}
```

Button's path resolves to `src/components/Button.tsx`.

## Groups

Groups are fragments that represent organizational units. When you splice `${Agent}` into a group:
- The agent becomes a **member** of that group
- When the group is referenced elsewhere, all members are included

```typescript
import { Agent, Org } from "fragment";

class Alice extends Agent("alice")`Senior engineer` {}
class Bob extends Agent("bob")`Junior engineer` {}

class Engineering extends Org.Group("engineering")`
## Engineering Team

Technical implementation and testing.

### Members
- ${Alice}
- ${Bob}

### Responsibilities
- Write code
- Review PRs
- Fix bugs
` {}
```

Now `Engineering` represents both Alice and Bob. Referencing `${Engineering}` anywhere includes both agents.

### Nested Groups

When you splice `${Group}` into another group:
- All members of the nested group become **transitive members** of the parent
- This enables hierarchical team structures

```typescript
class Platform extends Org.Group("platform")`
## Platform Team

Infrastructure and tooling.

### Members
- ${Engineering}
- ${DevOps}
` {}
```

Platform now includes all members of Engineering and DevOps.

## Roles

Roles are fragments that define capabilities. When you splice `${Toolkit}` into a role:
- The role **gains access** to all tools in that toolkit

```typescript
import { Org, Toolkit } from "fragment";
import { bash, read, write } from "fragment/tool";

class Coding extends Toolkit.Toolkit("Coding")`
Tools for development:
- ${bash}
- ${read}
- ${write}
` {}

class Developer extends Org.Role("developer")`
## Developer Role

Can write and execute code.

### Tools
${Coding}

### Standards
- Follow coding conventions
- Write tests for new code
- Document public APIs
` {}
```

When you splice `${Role}` into an agent:
- The agent **inherits all tools** from that role
- The role's description becomes part of the agent's context

```typescript
class Engineer extends Agent("engineer")`
# Engineer

## Roles
${Developer}

## Responsibilities
- Implement features
- Fix bugs
` {}
```

Engineer now has access to bash, read, and write tools from the Developer role.

## Channels

Channels are fragments that represent persistent communication spaces. When you splice `${Agent}` or `${Group}` into a channel:
- Agents become **participants** who can send and receive messages
- Groups are **expanded** — all members become participants

```typescript
import { Agent, Chat } from "fragment";

class EngineeringChannel extends Chat.Channel("engineering")`
## #engineering

Technical discussions and decisions.

### Members
- ${Engineering}

### Topics
- Architecture decisions
- Code reviews
- Technical debt
` {}
```

Since `${Engineering}` is a group containing Alice and Bob, both become channel participants.

## Group Chats

GroupChats are fragments for ad-hoc discussions. Like channels, splicing `${Agent}` or `${Group}`:
- Makes agents **participants** in the discussion
- Groups are expanded to include all members

```typescript
import { Chat } from "fragment";

class FeatureDiscussion extends Chat.GroupChat("feature-team")`
## Feature Development

Coordination for the new feature.

### Participants
- ${Frontend}
- ${Backend}
- ${Designer}

### Purpose
- Design collaboration
- Implementation planning
- Testing coordination
` {}
```

Frontend, Backend, and Designer can all participate in this group chat.

## License

MIT
