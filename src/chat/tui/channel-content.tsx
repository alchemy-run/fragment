/**
 * ChannelContent Component
 *
 * Content view for Channel fragments.
 * Displays chat with members sidebar.
 */

import type { ContentViewProps } from "../../fragment.ts";
import { ChatContent } from "../../tui/components/chat-content.tsx";
import type { Channel } from "../channel.ts";

/**
 * Content view for Channel fragments.
 * Shows chat view with members sidebar.
 */
export function ChannelContent(props: ContentViewProps<Channel>) {
  return (
    <ChatContent {...props} type="channel" showMembers={true} />
  );
}
