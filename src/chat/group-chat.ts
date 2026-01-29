import { defineFragment, type Fragment } from "../fragment.ts";
import { isAgent } from "../agent.ts";
import { GroupChatContent } from "./tui/group-chat-content.tsx";

/**
 * GroupChat type - a group chat with multiple participants defined via template.
 * Extends Fragment for template support.
 */
export interface GroupChat<
  ID extends string = string,
  References extends any[] = any[],
> extends Fragment<"group-chat", ID, References> {}

/**
 * Create a GroupChat - a group chat where multiple agents collaborate.
 *
 * GroupChats are defined in code using template literals with references,
 * similar to Agents. They represent ad-hoc communication spaces
 * for specific topics or tasks with threaded conversation support.
 *
 * @example
 * ```typescript
 * // Define agents
 * class Frontend extends Agent("frontend")`Frontend developer` {}
 * class Backend extends Agent("backend")`Backend developer` {}
 * class Designer extends Agent("designer")`UI/UX designer` {}
 *
 * // Create a feature development group chat
 * class FeatureTeam extends GroupChat("feature-team")`
 * Group chat for coordinating feature development.
 *
 * Team:
 * - ${Frontend}
 * - ${Backend}
 * - ${Designer}
 * ` {}
 * ```
 *
 * @example
 * ```typescript
 * // GroupChat with context files
 * class FeatureSpec extends File.Markdown("specs/feature.md")`Feature spec` {}
 *
 * class FeatureDiscussion extends GroupChat("feature-discussion")`
 * Discussion group for ${FeatureSpec}.
 *
 * Participants:
 * - ${ProductManager}
 * - ${TechLead}
 * ` {}
 * ```
 */
export const GroupChat = defineFragment("group-chat")({
  render: {
    context: (groupChat: GroupChat) => {
      // References are pre-resolved, so we can use isAgent directly
      const members = groupChat.references.filter(isAgent).map((a) => a.id);
      return members.length > 0 ? `@{${members.join(", ")}}` : `@{${groupChat.id}}`;
    },
    tui: {
      content: GroupChatContent,
      focusable: true,
    },
  },
});

/**
 * Type guard for GroupChat entities
 */
export const isGroupChat = GroupChat.is<GroupChat>;
