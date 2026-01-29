/**
 * Sidebar Component
 *
 * Discord-like sidebar with collapsible sections for DMs, Groups, Channels,
 * and dynamically-rendered fragment type sections.
 */

import { For, Show } from "solid-js";
import type { ChannelType } from "../../../state/thread.ts";
import type { Fragment, FragmentRender } from "../../../fragment.ts";
import { useRegistry } from "../../context/registry.tsx";
import { ChannelList } from "./channel-list.tsx";
import { DMList } from "./dm-list.tsx";
import { GroupList } from "./group-list.tsx";
import { Section } from "./section.tsx";

/**
 * Extended selection type including custom fragment types.
 */
export type SidebarSelectionType = ChannelType | string;

/**
 * Selection state for the sidebar
 */
export interface SidebarSelection {
  type: SidebarSelectionType;
  id: string;
}

export interface SidebarProps {
  /**
   * Current selection
   */
  selection?: SidebarSelection;

  /**
   * Callback when selection changes
   */
  onSelect?: (selection: SidebarSelection) => void;

  /**
   * Width of the sidebar
   * @default 30
   */
  width?: number;
}

/**
 * Group fragments by type for dynamic sidebar rendering.
 * Only includes fragment types that have render.tui.sidebar defined.
 */
interface FragmentTypeGroup {
  type: string;
  fragments: Fragment<string, string, any[]>[];
  render: FragmentRender<any>;
}

/**
 * Get the render config for a fragment.
 * Handles both own properties and inherited static properties.
 */
function getFragmentRender(fragment: any): FragmentRender<any> | undefined {
  // Try direct property access first
  if (fragment.render) {
    return fragment.render;
  }
  // Try looking up the prototype chain for static properties
  let proto = Object.getPrototypeOf(fragment);
  while (proto) {
    if (proto.render) {
      return proto.render;
    }
    proto = Object.getPrototypeOf(proto);
  }
  return undefined;
}

function groupFragmentsByType(
  fragments: Fragment<string, string, any[]>[],
): FragmentTypeGroup[] {
  const byType = new Map<string, FragmentTypeGroup>();

  for (const fragment of fragments) {
    const render = getFragmentRender(fragment);
    if (render?.tui?.sidebar) {
      const existing = byType.get(fragment.type);
      if (existing) {
        existing.fragments.push(fragment);
      } else {
        byType.set(fragment.type, {
          type: fragment.type,
          fragments: [fragment],
          render,
        });
      }
    }
  }

  return Array.from(byType.values());
}

/**
 * Discord-like sidebar with DMs, Groups, Channels, and dynamic fragment sections
 */
export function Sidebar(props: SidebarProps) {
  const width = () => props.width ?? 30;
  const registry = useRegistry();

  const handleSelectAgent = (agentId: string) => {
    props.onSelect?.({ type: "dm", id: agentId });
  };

  const handleSelectGroup = (groupId: string) => {
    props.onSelect?.({ type: "group", id: groupId });
  };

  const handleSelectChannel = (channelId: string) => {
    props.onSelect?.({ type: "channel", id: channelId });
  };

  const handleSelectFragment = (id: string, type: string) => {
    props.onSelect?.({ type, id });
  };

  const selectedAgentId = () =>
    props.selection?.type === "dm" ? props.selection.id : undefined;

  const selectedGroupId = () =>
    props.selection?.type === "group" ? props.selection.id : undefined;

  const selectedChannelId = () =>
    props.selection?.type === "channel" ? props.selection.id : undefined;

  const selectedFragmentId = (type: string) =>
    props.selection?.type === type ? props.selection.id : undefined;

  // Group fragments that have render.tui.sidebar defined
  const fragmentGroups = () => groupFragmentsByType(registry.github);

  return (
    <box
      flexDirection="column"
      width={width()}
      height="100%"
      borderStyle="single"
      borderColor="gray"
    >
      {/* DMs Section */}
      <Section title="Direct Messages">
        <DMList
          selectedAgentId={selectedAgentId()}
          onSelectAgent={handleSelectAgent}
        />
      </Section>

      {/* Groups Section */}
      <Section title="Groups">
        <GroupList
          selectedGroupChatId={selectedGroupId()}
          onSelectGroupChat={handleSelectGroup}
        />
      </Section>

      {/* Channels Section */}
      <Section title="Channels">
        <ChannelList
          selectedChannelId={selectedChannelId()}
          onSelectChannel={handleSelectChannel}
        />
      </Section>

      {/* Dynamic fragment type sections - rendered from render.tui.sidebar */}
      <For each={fragmentGroups()}>
        {(group) => (
          <Show when={group.fragments.length > 0}>
            <Section title={group.render.tui?.sectionTitle ?? group.type}>
              {group.render.tui?.sidebar?.({
                fragments: group.fragments,
                selectedId: selectedFragmentId(group.type),
                onSelect: handleSelectFragment,
              })}
            </Section>
          </Show>
        )}
      </For>
    </box>
  );
}
