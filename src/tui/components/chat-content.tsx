/**
 * ChatContent Component
 *
 * Shared wrapper that maps ContentViewProps to ChatViewProps.
 * Used by Channel, GroupChat, and Agent content views.
 */

import { useTerminalDimensions } from "@opentui/solid";
import { Show } from "solid-js";
import type { ContentViewProps, Fragment } from "../../fragment.ts";
import type { ChannelType } from "../../state/thread.ts";
import { ChatView } from "./chat-view.tsx";
import { MembersSidebar } from "./members-sidebar.tsx";

/**
 * Props for ChatContent - extends ContentViewProps with chat-specific options
 */
export interface ChatContentProps<T extends Fragment<string, string, any[]>>
  extends ContentViewProps<T> {
  /**
   * Channel type for the ChatView (dm, channel, or group)
   */
  type: ChannelType;

  /**
   * Whether to show the members sidebar
   */
  showMembers?: boolean;
}

/**
 * Shared chat content wrapper.
 * Maps fragment ContentViewProps to ChatViewProps.
 */
export function ChatContent<T extends Fragment<string, string, any[]>>(
  props: ChatContentProps<T>,
) {
  const dimensions = useTerminalDimensions();

  // Calculate sidebar width (same logic as App)
  const membersSidebarWidth = () =>
    Math.min(24, Math.floor(dimensions().width * 0.18));

  return (
    <>
      <ChatView
        type={props.type}
        id={props.fragment.id}
        focused={props.focused}
        onBack={props.onBack}
        onExit={props.onExit}
      />
      <Show when={props.showMembers}>
        <MembersSidebar
          type={props.type}
          id={props.fragment.id}
          width={membersSidebarWidth()}
          height={dimensions().height}
        />
      </Show>
    </>
  );
}
