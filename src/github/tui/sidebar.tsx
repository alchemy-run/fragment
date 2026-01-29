/**
 * GitHub Sidebar Component
 *
 * Renders GitHub fragments (repositories, issues, PRs) in the sidebar.
 * This component is provided via the tuix extension system.
 */

import { TextAttributes } from "@opentui/core";
import { For, Show } from "solid-js";
import type { Fragment } from "../../fragment.ts";
import { isGitHubRepository } from "../repository.ts";
import { isGitHubIssue } from "../issue.ts";
import { isGitHubPullRequest } from "../pull-request.ts";
import { isGitHubActions } from "../actions.ts";
import { isGitHubClone } from "../clone.ts";

/**
 * Props for GitHubSidebar
 */
export interface GitHubSidebarProps {
  /**
   * All GitHub-related fragments discovered in the org.
   */
  fragments: Fragment<string, string, any[]>[];

  /**
   * Currently selected fragment ID.
   */
  selectedId?: string;

  /**
   * Callback when a fragment is selected.
   */
  onSelect?: (id: string, type: string) => void;
}

/**
 * Get icon for a GitHub fragment type.
 */
const getIcon = (fragment: Fragment<string, string, any[]>): string => {
  if (isGitHubRepository(fragment)) return "📦";
  if (isGitHubIssue(fragment)) return "🐛";
  if (isGitHubPullRequest(fragment)) return "🔀";
  if (isGitHubActions(fragment)) return "⚡";
  if (isGitHubClone(fragment)) return "📂";
  return "🔗";
};

/**
 * Get color for a GitHub fragment type.
 */
const getColor = (fragment: Fragment<string, string, any[]>): string => {
  if (isGitHubRepository(fragment)) return "#fab283";
  if (isGitHubIssue(fragment)) return "#83fab2";
  if (isGitHubPullRequest(fragment)) return "#83b2fa";
  if (isGitHubActions(fragment)) return "#fab283";
  if (isGitHubClone(fragment)) return "#b283fa";
  return "#6a6a6a";
};

/**
 * Get display name for a GitHub fragment.
 */
const getDisplayName = (fragment: Fragment<string, string, any[]>): string => {
  // Access owner/repo from fragment props if available
  const props = fragment as any;
  if (props.owner && props.repo) {
    return `${props.owner}/${props.repo}`;
  }
  return fragment.id;
};

/**
 * GitHub sidebar section component.
 *
 * Renders a list of GitHub fragments grouped by type.
 */
export function GitHubSidebar(props: GitHubSidebarProps) {
  // Group fragments by type
  const repositories = () => props.fragments.filter(isGitHubRepository);
  const issues = () => props.fragments.filter(isGitHubIssue);
  const pullRequests = () => props.fragments.filter(isGitHubPullRequest);
  const actions = () => props.fragments.filter(isGitHubActions);
  const clones = () => props.fragments.filter(isGitHubClone);

  const handleSelect = (fragment: Fragment<string, string, any[]>) => {
    props.onSelect?.(fragment.id, fragment.type);
  };

  return (
    <box flexDirection="column">
      {/* Repositories */}
      <Show when={repositories().length > 0}>
        <box flexDirection="column" marginBottom={1}>
          <text fg="#6a6a6a" attributes={TextAttributes.DIM}>
            Repositories
          </text>
          <For each={repositories()}>
            {(repo) => (
              <GitHubItem
                fragment={repo}
                selected={props.selectedId === repo.id}
                onSelect={() => handleSelect(repo)}
              />
            )}
          </For>
        </box>
      </Show>

      {/* Issues */}
      <Show when={issues().length > 0}>
        <box flexDirection="column" marginBottom={1}>
          <text fg="#6a6a6a" attributes={TextAttributes.DIM}>
            Issues
          </text>
          <For each={issues()}>
            {(issue) => (
              <GitHubItem
                fragment={issue}
                selected={props.selectedId === issue.id}
                onSelect={() => handleSelect(issue)}
              />
            )}
          </For>
        </box>
      </Show>

      {/* Pull Requests */}
      <Show when={pullRequests().length > 0}>
        <box flexDirection="column" marginBottom={1}>
          <text fg="#6a6a6a" attributes={TextAttributes.DIM}>
            Pull Requests
          </text>
          <For each={pullRequests()}>
            {(pr) => (
              <GitHubItem
                fragment={pr}
                selected={props.selectedId === pr.id}
                onSelect={() => handleSelect(pr)}
              />
            )}
          </For>
        </box>
      </Show>

      {/* Actions */}
      <Show when={actions().length > 0}>
        <box flexDirection="column" marginBottom={1}>
          <text fg="#6a6a6a" attributes={TextAttributes.DIM}>
            Actions
          </text>
          <For each={actions()}>
            {(action) => (
              <GitHubItem
                fragment={action}
                selected={props.selectedId === action.id}
                onSelect={() => handleSelect(action)}
              />
            )}
          </For>
        </box>
      </Show>

      {/* Clones */}
      <Show when={clones().length > 0}>
        <box flexDirection="column" marginBottom={1}>
          <text fg="#6a6a6a" attributes={TextAttributes.DIM}>
            Local Clones
          </text>
          <For each={clones()}>
            {(clone) => (
              <GitHubItem
                fragment={clone}
                selected={props.selectedId === clone.id}
                onSelect={() => handleSelect(clone)}
              />
            )}
          </For>
        </box>
      </Show>

      {/* Empty state */}
      <Show when={props.fragments.length === 0}>
        <text fg="#4a4a4a">No GitHub resources</text>
      </Show>
    </box>
  );
}

/**
 * Props for GitHubItem
 */
interface GitHubItemProps {
  fragment: Fragment<string, string, any[]>;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Single GitHub item in the sidebar.
 */
function GitHubItem(props: GitHubItemProps) {
  const icon = () => getIcon(props.fragment);
  const color = () => getColor(props.fragment);
  const displayName = () => getDisplayName(props.fragment);

  return (
    <box
      flexDirection="row"
      paddingLeft={1}
      backgroundColor={props.selected ? "#2a2a4e" : undefined}
    >
      <text fg={color()}>{icon()} </text>
      <text
        fg={props.selected ? "#ffffff" : color()}
        attributes={props.selected ? TextAttributes.BOLD : undefined}
      >
        {displayName()}
      </text>
    </box>
  );
}

export default GitHubSidebar;
