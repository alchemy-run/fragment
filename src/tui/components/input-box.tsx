/**
 * InputBox Component
 *
 * Text input for sending messages to agents.
 * Supports inline suggestions for:
 * - @ mentions (agents, channels, groups)
 * - ./ and ../ file paths
 *
 * The suggestions popover is rendered by the parent (ChatView) to avoid
 * disrupting layout. InputBox exposes popover state via callback.
 */

import type { InputRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/solid";
import { createEffect, createMemo, createSignal } from "solid-js";
import { filterAgentPaths } from "../../util/fuzzy-search.ts";

/**
 * Popover mode - which type of suggestions to show
 */
export type PopoverMode = "mention" | "file" | null;

/**
 * A mentionable option (agent, channel, or group)
 */
export interface MentionOption {
  type: "agent" | "channel" | "group";
  id: string;
  display: string;
}

/**
 * A file path suggestion
 */
export interface FileOption {
  type: "file" | "directory";
  path: string;
  display: string;
}

/**
 * Union type for any suggestion
 */
export type Suggestion = MentionOption | FileOption;

/**
 * Popover state exposed to parent for rendering
 */
export interface PopoverState {
  mode: PopoverMode;
  suggestions: Suggestion[];
  selectedIndex: number;
  /**
   * For file mode: the query string after ./ or ../
   * Parent can use this to fetch file suggestions
   */
  fileQuery?: string;
  /**
   * For file mode: the prefix (./ or ../)
   */
  filePrefix?: string;
}

/**
 * Props for InputBox
 */
export interface InputBoxProps {
  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Callback when message is submitted
   */
  onSubmit: (message: string) => void;

  /**
   * Whether the input is disabled
   */
  disabled?: boolean;

  /**
   * Whether the input is focused
   */
  focused?: boolean;

  /**
   * Callback when Ctrl+P is pressed (to open agent picker)
   */
  onOpenPicker?: () => void;

  /**
   * List of mentionable suggestions (agents, channels, groups)
   * Used when @ is typed
   */
  mentionSuggestions?: MentionOption[];

  /**
   * List of file suggestions (files and directories)
   * Used when ./ or ../ is typed
   */
  fileSuggestions?: FileOption[];

  /**
   * Callback when popover state changes (for parent to render)
   */
  onPopoverChange?: (state: PopoverState) => void;

  /**
   * @deprecated Use mentionSuggestions instead
   */
  suggestions?: MentionOption[];
}

/**
 * Pattern match result with start position
 */
interface PatternMatch {
  query: string;
  start: number;
  prefix: string;
}

/**
 * Text input component for sending messages
 */
export function InputBox(props: InputBoxProps) {
  const [value, setValue] = createSignal("");
  const [popoverMode, setPopoverMode] = createSignal<PopoverMode>(null);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: InputRenderable | undefined;

  // Support both old and new prop names
  const mentionSuggestions = () =>
    props.mentionSuggestions ?? props.suggestions ?? [];
  const fileSuggestions = () => props.fileSuggestions ?? [];

  // Detect @ pattern for mentions
  const mentionMatch = createMemo((): PatternMatch | null => {
    const text = value();
    const match = text.match(/@(\S*)$/);
    return match
      ? { query: match[1], start: match.index ?? 0, prefix: "@" }
      : null;
  });

  // Detect ./ or ../ pattern for files (but NOT / alone - reserved for slash commands)
  const fileMatch = createMemo((): PatternMatch | null => {
    const text = value();
    // Match ./ or ../ followed by optional path
    // First check if it starts with ./ or ../
    const baseMatch = text.match(/(\.\.?\/\S*)$/);
    if (!baseMatch) return null;

    const fullPath = baseMatch[1]; // e.g., "./src/com" or "./"
    const startIndex = baseMatch.index ?? 0;

    // Split into directory prefix and query (last component after final /)
    const lastSlash = fullPath.lastIndexOf("/");
    const prefix = fullPath.slice(0, lastSlash + 1); // e.g., "./" or "./src/"
    const query = fullPath.slice(lastSlash + 1); // e.g., "" or "com"

    return {
      query,
      start: startIndex,
      prefix,
    };
  });

  // Determine which mode should be active based on patterns
  createEffect(() => {
    const mention = mentionMatch();
    const file = fileMatch();

    if (mention && mentionSuggestions().length > 0) {
      setPopoverMode("mention");
      setSelectedIndex(0);
    } else if (file) {
      // Always activate file mode when pattern is detected
      // Parent will provide suggestions reactively
      setPopoverMode("file");
      setSelectedIndex(0);
    } else {
      setPopoverMode(null);
    }
  });

  // Filter mention suggestions based on query
  const filteredMentions = createMemo(() => {
    const match = mentionMatch();
    const suggestions = mentionSuggestions();
    if (!match || popoverMode() !== "mention") return [];

    const displays = suggestions.map((s) => s.display);
    const filtered = filterAgentPaths(displays, match.query);

    return filtered
      .map((result) => suggestions.find((s) => s.display === result.item))
      .filter((s): s is MentionOption => s !== undefined)
      .slice(0, 10);
  });

  // Filter file suggestions based on query
  const filteredFiles = createMemo(() => {
    const match = fileMatch();
    const suggestions = fileSuggestions();
    if (!match || popoverMode() !== "file") return [];

    const displays = suggestions.map((s) => s.display);
    const filtered = filterAgentPaths(displays, match.query);

    return filtered
      .map((result) => suggestions.find((s) => s.display === result.item))
      .filter((s): s is FileOption => s !== undefined)
      .slice(0, 10);
  });

  // Get current suggestions based on mode
  const currentSuggestions = createMemo((): Suggestion[] => {
    switch (popoverMode()) {
      case "mention":
        return filteredMentions();
      case "file":
        return filteredFiles();
      default:
        return [];
    }
  });

  // Notify parent of popover state changes
  createEffect(() => {
    const file = fileMatch();
    props.onPopoverChange?.({
      mode: popoverMode(),
      suggestions: currentSuggestions(),
      selectedIndex: selectedIndex(),
      fileQuery: file?.query,
      filePrefix: file?.prefix,
    });
  });

  // Focus the input whenever the focused prop becomes true
  createEffect(() => {
    if (props.focused && inputRef) {
      inputRef.focus();
    }
  });

  // Insert selected mention into input
  const insertMention = (option: MentionOption) => {
    const match = mentionMatch();
    if (!match) return;

    const text = value();
    const prefix =
      option.type === "agent"
        ? "@"
        : option.type === "channel"
          ? "#"
          : "&";
    const before = text.slice(0, match.start);
    const after = `${prefix}${option.display} `;
    setValue(before + after);
    setPopoverMode(null);
  };

  // Insert selected file into input
  const insertFile = (option: FileOption) => {
    const match = fileMatch();
    if (!match) return;

    const text = value();
    const before = text.slice(0, match.start);
    // Keep the prefix (e.g., "./src/") and append the selected path
    // For directories, don't add trailing space so user can continue typing
    const suffix = option.type === "directory" ? "" : " ";
    const after = `${match.prefix}${option.path}${suffix}`;
    setValue(before + after);
    // Only close popover for files, keep open for directories to continue navigation
    if (option.type !== "directory") {
      setPopoverMode(null);
    }
  };

  // Insert current selection based on mode
  const insertSelection = () => {
    const suggestions = currentSuggestions();
    const index = selectedIndex();
    if (suggestions.length === 0 || index >= suggestions.length) return;

    const selected = suggestions[index];
    if (selected.type === "file" || selected.type === "directory") {
      insertFile(selected as FileOption);
    } else {
      insertMention(selected as MentionOption);
    }
  };

  // Handle keyboard navigation for popover
  useKeyboard((evt) => {
    // Ctrl+P: Open agent picker
    if (evt.ctrl && evt.name === "p") {
      props.onOpenPicker?.();
      return;
    }

    // Handle popover navigation
    if (popoverMode()) {
      const suggestions = currentSuggestions();

      if (evt.name === "up") {
        evt.preventDefault();
        evt.stopPropagation();
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }

      if (evt.name === "down") {
        evt.preventDefault();
        evt.stopPropagation();
        setSelectedIndex((i) => Math.min(suggestions.length - 1, i + 1));
        return;
      }

      if (evt.name === "tab" || evt.name === "return") {
        if (suggestions.length > 0) {
          evt.preventDefault();
          evt.stopPropagation();
          insertSelection();
          return;
        }
      }

      if (evt.name === "escape") {
        evt.preventDefault();
        evt.stopPropagation();
        setPopoverMode(null);
        return;
      }
    }
  });

  const handleInput = (text: string) => {
    // Allow typing even while disabled (loading) so user can compose next message
    setValue(text);
  };

  const handleSubmit = () => {
    // Don't submit if popover is open - enter selects the suggestion
    if (popoverMode() && currentSuggestions().length > 0) {
      insertSelection();
      return;
    }

    const message = value().trim();
    if (message && !props.disabled) {
      props.onSubmit(message);
      setValue("");
    }
  };

  return (
    <box
      width="100%"
      padding={1}
      borderStyle="rounded"
      borderColor={props.focused ? "#fab283" : "#3a3a3a"}
      backgroundColor="#1a1a2e"
    >
      <input
        ref={(r) => {
          inputRef = r;
        }}
        value={value()}
        onInput={handleInput}
        onSubmit={handleSubmit}
        placeholder={props.placeholder || "Type a message..."}
        focusedBackgroundColor="#1a1a2e"
        cursorColor="#fab283"
        focusedTextColor="#eaeaea"
      />
    </box>
  );
}

/**
 * Helper to get display prefix for mention types
 */
export function getMentionPrefix(type: MentionOption["type"]): string {
  switch (type) {
    case "agent":
      return "@";
    case "channel":
      return "#";
    case "group":
      return "&";
  }
}

/**
 * Helper to get color for suggestion type
 */
export function getSuggestionColor(
  suggestion: Suggestion,
  isSelected: boolean,
): string {
  if (isSelected) return "#ffffff";
  switch (suggestion.type) {
    case "agent":
      return "#fab283";
    case "channel":
      return "#8383fa";
    case "group":
      return "#83fab2";
    case "file":
      return "#a0a0a0";
    case "directory":
      return "#83b2fa";
  }
}

/**
 * Helper to get icon for file type
 */
export function getFileIcon(type: FileOption["type"]): string {
  return type === "directory" ? "📁 " : "📄 ";
}
