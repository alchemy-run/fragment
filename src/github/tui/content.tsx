/**
 * GitHub Content View Components
 *
 * Provides content view renderers for GitHub fragment types.
 * Used via the render.tui.content extension system.
 */

import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { Show } from "solid-js";
import type { ContentViewProps } from "../../fragment.ts";
import type { RepositoryProps } from "../repository.ts";

/**
 * Content view for GitHub Repository fragments.
 * Displays repository information when selected in the sidebar.
 */
export function GitHubRepositoryContent(
  props: ContentViewProps<{ id: string; type: string } & RepositoryProps>,
) {
  const dimensions = useTerminalDimensions();
  const fragment = () => props.fragment;

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor="#0f0f1a"
    >
      {/* Header */}
      <box
        height={3}
        padding={1}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        borderStyle="single"
        borderColor={props.focused ? "#fab283" : "#3a3a3a"}
      >
        <text fg="#fab283" attributes={TextAttributes.BOLD}>
          {fragment().owner}/{fragment().repo}
        </text>
        <Show when={!props.focused}>
          <text fg="#666666">GitHub Repository</text>
        </Show>
      </box>

      {/* Content */}
      <box
        flexGrow={1}
        padding={1}
        flexDirection="column"
        borderStyle="single"
        borderColor="#3a3a3a"
      >
        {/* Repository Info */}
        <box flexDirection="column" paddingBottom={1}>
          <text fg="#888888">Repository</text>
          <text fg="#ffffff">
            https://github.com/{fragment().owner}/{fragment().repo}
          </text>
        </box>

        <Show when={fragment().defaultBranch}>
          <box flexDirection="column" paddingBottom={1}>
            <text fg="#888888">Default Branch</text>
            <text fg="#a3be8c">{fragment().defaultBranch}</text>
          </box>
        </Show>

        {/* Separator */}
        <box paddingTop={1} paddingBottom={1}>
          <text fg="#3a3a3a">
            {"─".repeat(Math.max(0, dimensions().width - 40))}
          </text>
        </box>

        {/* Actions hint */}
        <box flexDirection="column">
          <text fg="#888888">Available Actions</text>
          <box paddingTop={1} flexDirection="column">
            <text fg="#666666">
              • Use GitHub.fetchIssues() to list issues
            </text>
            <text fg="#666666">
              • Use GitHub.fetchPullRequests() to list PRs
            </text>
            <text fg="#666666">
              • Use GitHub.fetchWorkflowRuns() to list CI runs
            </text>
          </box>
        </box>
      </box>

      {/* Footer with help */}
      <box height={1} paddingLeft={1}>
        <text fg="#666666">ESC: back to sidebar</text>
      </box>
    </box>
  );
}
