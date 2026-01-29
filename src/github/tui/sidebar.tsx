/**
 * GitHub Sidebar Components
 *
 * Provides sidebar renderers for GitHub fragment types.
 * Used via the render.tui.sidebar extension system.
 */

import { TextAttributes } from "@opentui/core";
import { For, Show } from "solid-js";

/**
 * Props for fragment sidebar components.
 * Uses `any` for fragments to allow flexible typing from the registry.
 */
export interface FragmentSidebarProps {
  fragments: any[];
  selectedId?: string;
  onSelect?: (id: string, type: string) => void;
}

/**
 * Single sidebar item component.
 */
function SidebarItem(props: {
  id: string;
  type: string;
  displayName: string;
  icon: string;
  color: string;
  selected: boolean;
  onSelect?: (id: string, type: string) => void;
}) {
  return (
    <box
      flexDirection="row"
      paddingLeft={1}
      backgroundColor={props.selected ? "#2a2a4e" : undefined}
    >
      <text fg={props.color}>{props.icon} </text>
      <text
        fg={props.selected ? "#ffffff" : props.color}
        attributes={props.selected ? TextAttributes.BOLD : undefined}
      >
        {props.displayName}
      </text>
    </box>
  );
}

/**
 * GitHub Repository sidebar component.
 * Renders a list of repository fragments.
 */
export function GitHubRepositorySidebar(props: FragmentSidebarProps) {
  return (
    <box flexDirection="column">
      <Show when={props.fragments.length > 0}>
        <For each={props.fragments}>
          {(repo) => (
            <SidebarItem
              id={repo.id}
              type={repo.type}
              displayName={`${(repo as any).owner}/${(repo as any).repo}`}
              icon="📦"
              color="#fab283"
              selected={props.selectedId === repo.id}
              onSelect={props.onSelect}
            />
          )}
        </For>
      </Show>
      <Show when={props.fragments.length === 0}>
        <text fg="#4a4a4a">No repositories</text>
      </Show>
    </box>
  );
}

/**
 * GitHub Clone sidebar component.
 * Renders a list of clone fragments.
 */
export function GitHubCloneSidebar(props: FragmentSidebarProps) {
  return (
    <box flexDirection="column">
      <Show when={props.fragments.length > 0}>
        <For each={props.fragments}>
          {(clone) => (
            <SidebarItem
              id={clone.id}
              type={clone.type}
              displayName={(clone as any).path ?? clone.id}
              icon="📂"
              color="#b283fa"
              selected={props.selectedId === clone.id}
              onSelect={props.onSelect}
            />
          )}
        </For>
      </Show>
      <Show when={props.fragments.length === 0}>
        <text fg="#4a4a4a">No clones</text>
      </Show>
    </box>
  );
}

// Legacy export for backwards compatibility
export { GitHubRepositorySidebar as GitHubSidebar };
export default GitHubRepositorySidebar;
