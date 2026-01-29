/**
 * GroupChatContent Component
 *
 * Content view for GroupChat fragments.
 * Displays chat with members sidebar.
 */

import type { ContentViewProps } from "../../fragment.ts";
import { ChatContent } from "../../tui/components/chat-content.tsx";
import type { GroupChat } from "../group-chat.ts";

/**
 * Content view for GroupChat fragments.
 * Shows chat view with members sidebar.
 */
export function GroupChatContent(props: ContentViewProps<GroupChat>) {
  return (
    <ChatContent {...props} type="group" showMembers={true} />
  );
}
