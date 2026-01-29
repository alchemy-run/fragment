/**
 * AgentContent Component
 *
 * Content view for Agent fragments.
 * Displays direct message chat without members sidebar.
 */

import type { Agent } from "../../agent.ts";
import type { ContentViewProps } from "../../fragment.ts";
import { ChatContent } from "./chat-content.tsx";

/**
 * Content view for Agent fragments.
 * Shows direct message chat view (no members sidebar).
 */
export function AgentContent(props: ContentViewProps<Agent>) {
  return (
    <ChatContent {...props} type="dm" showMembers={false} />
  );
}
