# fragment

Model AI agents and organizations as code using string templates.

## Features

- **Declarative agents** — Define AI agents with organizational context using template literals
- **Organizational structure** — Groups, Roles, Channels, and GroupChats model real team dynamics
- **Typed tools** — Tools with Effect-based handlers and schema-validated inputs/outputs
- **File references** — Agents can reference folders, markdown, TypeScript, and other files
- **TUI interface** — Interactive terminal UI for chatting with agents

## Installation

```bash
npm install fragment effect @effect/ai @effect/platform
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
npx fragment
```

## Agents

Agents are AI entities defined via template literals. The template becomes the agent's system prompt:

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

Agents can reference other agents, creating an organizational hierarchy:

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

## Groups

Groups are organizational units containing agents:

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

### Nested Groups

Groups can contain other groups for hierarchical organization:

```typescript
class Platform extends Org.Group("platform")`
## Platform Team

Infrastructure and tooling.

### Members
- ${Engineering}
- ${DevOps}
` {}
```

## Roles

Roles define capabilities and permissions that agents can inherit:

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

Agents inherit tools from their roles:

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

## Channels

Channels are communication spaces where agents collaborate:

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

## Group Chats

GroupChats are ad-hoc discussions for specific topics:

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

## Tools

Tools are Effect-based functions with typed inputs and outputs:

```typescript
import { Tool, input, output } from "fragment";
import * as S from "effect/Schema";
import * as Effect from "effect/Effect";

const filePath = input("path")`The file path to read`;
const content = output("content", S.String);

const readFile = Tool.tool("read-file")`
Read a file at ${filePath} and return its ${content}
`(function* ({ path }) {
  const fs = yield* FileSystem;
  const data = yield* fs.readFileString(path);
  return { content: data };
});
```

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

Toolkits bundle related tools together:

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

## Files

File references let agents understand project structure:

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

Files can reference other files to build a hierarchy:

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

## Complete Example

Here's a complete organizational structure:

```typescript
import { Agent, Chat, Org, Toolkit, File } from "fragment";
import { bash, read, write, edit, grep, glob } from "fragment/tool";

// Files
class Docs extends File.Folder`docs/``Documentation` {}
class Src extends File.Folder`src/``Source code` {}
class Tests extends File.Folder`test/``Test files` {}

// Toolkits
class Coding extends Toolkit.Toolkit("Coding")`
Development tools:
- ${bash} - ${read} - ${write} - ${edit} - ${grep} - ${glob}
` {}

class Reviewing extends Toolkit.Toolkit("Reviewing")`
Review tools (read-only):
- ${read} - ${grep} - ${glob}
` {}

// Roles
class DeveloperRole extends Org.Role("developer")`
## Developer
Can write code. Uses ${Coding}.
` {}

class ReviewerRole extends Org.Role("reviewer")`
## Reviewer
Can review code. Uses ${Reviewing}.
` {}

// Agents
class SeniorEngineer extends Agent("senior-engineer")`
# Senior Engineer

## Roles
${DeveloperRole}
${ReviewerRole}

## Responsibilities
- Architect solutions
- Review junior work
- Mentor team
` {}

class JuniorEngineer extends Agent("junior-engineer")`
# Junior Engineer

## Roles
${DeveloperRole}

## Responsibilities
- Implement features
- Write tests
- Learn from reviews
` {}

// Groups
class Engineering extends Org.Group("engineering")`
## Engineering Team
- ${SeniorEngineer}
- ${JuniorEngineer}
` {}

// Channels
class EngineeringChannel extends Chat.Channel("engineering")`
## #engineering
Technical discussions.
Members: ${Engineering}
` {}

// Root Agent (default export)
export default class TechLead extends Agent("tech-lead")`
# Tech Lead

## Organization
- ${Engineering}

## Channels
- ${EngineeringChannel}

## Artifacts
- ${Docs} - ${Src} - ${Tests}

## Responsibilities
- Set technical direction
- Remove blockers
- Coordinate delivery
` {}
```

## CLI

```bash
# Launch TUI with default config (./fragment.config.ts)
fragment

# Use a custom config file
fragment ./path/to/config.ts

# Use a specific model
fragment --model claude-opus

# Run from another directory
fragment --cwd ../my-project
```

### Available Models

- `claude-sonnet` (default) — Claude Sonnet 4
- `claude-haiku` — Claude Haiku 4.5
- `claude-opus` — Claude Opus 4

Or specify a full model ID:

```bash
fragment --model claude-sonnet-4-20250514
```

## Environment Variables

Create a `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## API

### Spawning Agents Programmatically

```typescript
import { spawn, Agent } from "fragment";
import { StateStore } from "fragment";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

class MyAgent extends Agent("my-agent")`A helpful assistant` {}

const program = Effect.gen(function* () {
  const instance = yield* spawn(MyAgent);
  
  // Stream responses
  const response = yield* instance.send("Hello!").pipe(
    Stream.runCollect,
  );
  
  // Or query for structured data
  const result = yield* instance.query(
    "List the top 3 priorities",
    S.Array(S.String),
  );
});
```

### Creating Custom Tools

```typescript
import { Tool, input, output } from "fragment";
import * as S from "effect/Schema";
import * as Effect from "effect/Effect";

const query = input("query")`SQL query to execute`;
const rows = output("rows", S.Array(S.Record(S.String, S.Unknown)));

const sqlQuery = Tool.tool("sql-query")`
Execute a SQL ${query} and return ${rows}
`(function* ({ query }) {
  const db = yield* Database;
  const result = yield* db.execute(query);
  return { rows: result };
});
```

## Architecture

Fragment uses a declarative template-based approach where:

1. **Templates become prompts** — Agent templates are rendered into system prompts
2. **References create relationships** — `${OtherAgent}` creates a reference that's resolved at runtime
3. **Tools are typed** — Input/output schemas provide type safety and validation
4. **State is persistent** — Conversations are stored in SQLite for continuity

The TUI provides a Slack-like interface for navigating the organization and chatting with agents.

## License

MIT
