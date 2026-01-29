/**
 * ChatView Component
 *
 * Chat view for a selected agent/channel/group with message stream and input.
 * Now simplified to just subscribe to MessagingService and render DisplayEvents.
 */

import * as Fs from "node:fs";
import * as Path from "node:path";
import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Stream from "effect/Stream";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import {
  createMessagingService,
  type MessagingService,
} from "../../messaging-service.ts";
import type { ChannelType, DisplayEvent } from "../../state/thread.ts";
import { logError } from "../../util/log.ts";
import { useRegistry } from "../context/registry.tsx";
import { useStore } from "../context/store.tsx";
import {
  getFileIcon,
  getMentionPrefix,
  getSuggestionColor,
  InputBox,
  type FileOption,
  type MentionOption,
  type PopoverState,
} from "./input-box.tsx";
import { MessageStream } from "./message-stream.tsx";

/**
 * Props for ChatView
 */
export interface ChatViewProps {
  /**
   * Type of the selected item (dm, channel, or group)
   */
  type: ChannelType;

  /**
   * ID of the agent, channel, or group
   */
  id: string;

  /**
   * Thread ID (optional, defaults to id)
   */
  threadId?: string;

  /**
   * Whether the chat view is focused (vs sidebar)
   */
  focused?: boolean;

  /**
   * Callback to go back to agent picker
   */
  onBack: () => void;

  /**
   * Callback to exit the app
   */
  onExit: () => void;
}

/**
 * Chat view with message stream and input
 */
export function ChatView(props: ChatViewProps) {
  const dimensions = useTerminalDimensions();
  const registry = useRegistry();
  const store = useStore();

  // Build mention suggestions from registry (for @ mentions)
  const mentionSuggestions = createMemo((): MentionOption[] => [
    ...registry.agents.map((a) => ({
      type: "agent" as const,
      id: a.id,
      display: a.id,
    })),
    ...registry.channels.map((c) => ({
      type: "channel" as const,
      id: c.id,
      display: c.id,
    })),
    ...registry.groupChats.map((g) => ({
      type: "group" as const,
      id: g.id,
      display: g.id,
    })),
  ]);

  // File suggestions for ./ and ../ paths
  const [fileSuggestions, setFileSuggestions] = createSignal<FileOption[]>([]);
  // Track the last fetched prefix to avoid redundant reads
  let lastFetchedPrefix = "";

  // Popover state from InputBox (for rendering suggestions above input)
  const [popoverState, setPopoverState] = createSignal<PopoverState>({
    mode: null,
    suggestions: [],
    selectedIndex: 0,
  });

  // Fetch directory contents when file mode is active
  // Only re-fetch when the directory prefix actually changes
  createEffect(() => {
    const state = popoverState();
    const mode = state.mode;
    const filePrefix = state.filePrefix;

    if (mode !== "file" || !filePrefix) {
      if (lastFetchedPrefix !== "") {
        lastFetchedPrefix = "";
        setFileSuggestions([]);
      }
      return;
    }

    // Skip if we already fetched this prefix
    if (filePrefix === lastFetchedPrefix) {
      return;
    }

    lastFetchedPrefix = filePrefix;

    // Resolve the directory path
    const dirPath = Path.resolve(process.cwd(), filePrefix);

    // Read directory synchronously to avoid async issues in effects
    // Use a try-catch since the directory might not exist
    try {
      const entries = Fs.readdirSync(dirPath, { withFileTypes: true });

      // Convert to FileOption format
      const options: FileOption[] = entries
        .filter((entry) => !entry.name.startsWith(".")) // Skip hidden files
        .map((entry) => ({
          type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
          path: entry.isDirectory() ? `${entry.name}/` : entry.name,
          display: entry.isDirectory() ? `${entry.name}/` : entry.name,
        }))
        .sort((a, b) => {
          // Directories first, then alphabetically
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          return a.display.localeCompare(b.display);
        });

      setFileSuggestions(options);
    } catch {
      // Directory doesn't exist or can't be read
      setFileSuggestions([]);
    }
  });

  // Display events from MessagingService - the single source of truth
  // No more separate messages/parts - just display events
  const [displayEvents, setDisplayEvents] = createSignal<DisplayEvent[]>([]);
  const [error, setError] = createSignal<string>();
  const [loading, setLoading] = createSignal(false);

  // Cache the MessagingService - created once on mount, reused for all operations
  const [messagingService, setMessagingService] = createSignal<
    MessagingService | undefined
  >();

  onMount(() => {
    // Create the MessagingService once when the component mounts
    const effect = createMessagingService(registry);
    store.runtime.runPromise(effect).then(
      (service) => setMessagingService(service),
      (err) => {
        logError("ChatView", "failed to create messaging service", err);
        setError(err instanceof Error ? err.message : String(err));
      },
    );
  });

  const threadId = () => props.threadId || props.id;

  // Get the display prefix based on type
  const displayPrefix = () => {
    switch (props.type) {
      case "channel":
        return "#";
      case "group":
        return "&";
      default:
        return "@";
    }
  };

  // Track subscription fiber for cleanup
  let subscriptionFiber: Fiber.RuntimeFiber<void, unknown> | undefined;

  // Helper to cleanup current subscription
  const cleanupSubscription = () => {
    if (subscriptionFiber) {
      Effect.runFork(Fiber.interrupt(subscriptionFiber));
      subscriptionFiber = undefined;
    }
  };

  // Subscribe to display events when selection or service changes
  createEffect(
    on(
      () => [props.type, props.id, threadId(), messagingService()] as const,
      ([channelType, _id, currentThreadId, service]) => {
        // Cleanup previous subscription
        cleanupSubscription();

        // Clear previous state
        setDisplayEvents([]);
        setError(undefined);

        // Need service to subscribe
        if (!service) {
          return;
        }

        // Subscribe to display events from MessagingService
        // This is the single source of truth - no direct StateStore access
        const effect = Effect.gen(function* () {
          // MessagingService.subscribe() returns a stream that:
          // - Loads historical messages and converts to display events
          // - Subscribes to raw parts and transforms based on channel type
          // - For DMs: streams text deltas in real-time
          // - For channels/groups: buffers text, emits complete messages only
          const stream = yield* service.subscribe(channelType, currentThreadId);

          yield* stream.pipe(
            Stream.runForEach((event) =>
              Effect.sync(() => {
                // Just accumulate display events - all processing is done by backend
                setDisplayEvents((prev) => [...prev, event]);
              }),
            ),
          );
        }).pipe(
          Effect.catchAllCause((cause) =>
            Effect.sync(() => {
              // Only log if it's not an interruption (normal cleanup)
              if (!Cause.isInterruptedOnly(cause)) {
                logError("ChatView", "subscription stream error", cause);
                setError(Cause.pretty(cause));
              }
            }),
          ),
        );

        subscriptionFiber = store.runtime.runFork(effect);

        // Observe the fiber for errors (e.g., layer initialization failures)
        Effect.runPromise(Fiber.await(subscriptionFiber)).then((exit) => {
          if (Exit.isFailure(exit)) {
            const cause = exit.cause;
            // Only log if it's not an interruption (normal cleanup)
            if (!Cause.isInterruptedOnly(cause)) {
              const prettyError = Cause.pretty(cause);
              logError("ChatView", "fiber error", cause);
              setError(prettyError);
            }
          }
        });
      },
    ),
  );

  // Cleanup on unmount
  onCleanup(cleanupSubscription);

  // Handle keyboard
  useKeyboard((evt) => {
    // Ctrl+C: Exit
    if (evt.ctrl && evt.name === "c") {
      evt.preventDefault();
      evt.stopPropagation();
      props.onExit();
      return;
    }

    // Escape: Go back to picker
    if (evt.name === "escape") {
      evt.preventDefault();
      evt.stopPropagation();
      props.onBack();
      return;
    }
  });

  // Handle sending messages
  // ChatView is now thin - it just calls MessagingService.send()
  // Display updates come from the subscription
  const handleSubmit = (message: string) => {
    const service = messagingService();
    if (!service) {
      setError("MessagingService not ready yet");
      return;
    }

    setError(undefined);
    setLoading(true);

    // MessagingService.send() now returns Effect<void>
    // It writes user message to DB, publishes to stream, and spawns agents
    // Display updates come from our subscription to service.subscribe()
    const sendEffect = service
      .send(props.type, props.id, threadId(), message)
      .pipe(
        Effect.catchAllCause((cause) =>
          Effect.sync(() => {
            logError("ChatView", "send message error", cause);
            setError(Cause.pretty(cause));
          }),
        ),
        Effect.ensuring(Effect.sync(() => setLoading(false))),
      );

    // Use runPromise to catch any layer initialization errors
    store.runtime.runPromise(sendEffect).catch((err) => {
      logError("ChatView", "layer initialization error", err);
      const errorStr = err instanceof Error ? err.message : String(err);
      setError(errorStr);
      setLoading(false);
    });
  };

  // Calculate heights
  const headerHeight = 3;
  const inputHeight = 5;
  // Popover takes space from message area when open
  const popoverHeight = () => {
    const state = popoverState();
    if (!state.mode || state.suggestions.length === 0) return 0;
    // Each suggestion row is 1 line + 2 for border
    return Math.min(state.suggestions.length, 10) + 2;
  };
  const messageHeight = () =>
    dimensions().height - headerHeight - inputHeight - popoverHeight() - 2;

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor="#0f0f1a"
    >
      {/* Header */}
      <box
        height={headerHeight}
        padding={1}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        borderStyle="single"
        borderColor="#3a3a3a"
      >
        <box flexDirection="row" gap={2}>
          <text fg="#fab283" attributes={TextAttributes.BOLD}>
            {displayPrefix()}{props.id}
          </text>
          <Show when={props.threadId && props.threadId !== props.id}>
            <text fg="#6a6a6a">/</text>
            <text fg="#8383fa">{props.threadId}</text>
          </Show>
        </box>
        <box flexDirection="row" gap={2}>
          <Show when={loading()}>
            <text fg="#fab283">● streaming...</text>
          </Show>
          <text fg="#6a6a6a">esc back</text>
        </box>
      </box>

      {/* Message stream - just renders DisplayEvents, no processing needed */}
      <MessageStream
        events={displayEvents}
        height={messageHeight()}
      />

      {/* Error display */}
      <Show when={error()}>
        <box padding={1} backgroundColor="#4a1a1a">
          <text fg="#fa8383">Error: {error()}</text>
        </box>
      </Show>

      {/* Suggestions popover - rendered above input, takes space from message area */}
      <Show when={popoverState().mode && popoverState().suggestions.length > 0}>
        <box
          height={popoverHeight()}
          borderStyle="single"
          borderColor={popoverState().mode === "mention" ? "#fab283" : "#83b2fa"}
          backgroundColor="#1a1a2e"
        >
          <box flexDirection="column" paddingLeft={1} paddingRight={1}>
            <For each={popoverState().suggestions}>
              {(suggestion, index) => {
                const isSelected = () => index() === popoverState().selectedIndex;
                return (
                  <box
                    backgroundColor={isSelected() ? "#2a2a4e" : undefined}
                    paddingLeft={1}
                  >
                    <text fg={isSelected() ? "#ffffff" : "#6a6a6a"}>
                      {isSelected() ? "> " : "  "}
                    </text>
                    <Switch>
                      <Match
                        when={
                          suggestion.type === "file" ||
                          suggestion.type === "directory"
                        }
                      >
                        <text fg={getSuggestionColor(suggestion, isSelected())}>
                          {getFileIcon((suggestion as FileOption).type)}
                          {suggestion.display}
                        </text>
                      </Match>
                      <Match when={true}>
                        <text fg={getSuggestionColor(suggestion, isSelected())}>
                          {getMentionPrefix((suggestion as MentionOption).type)}
                          {suggestion.display}
                        </text>
                      </Match>
                    </Switch>
                  </box>
                );
              }}
            </For>
          </box>
        </box>
      </Show>

      {/* Input - fixed height container */}
      <box height={inputHeight}>
        <InputBox
          onSubmit={handleSubmit}
          disabled={loading()}
          focused={props.focused ?? true}
          placeholder={loading() ? "Waiting for response..." : "Type a message..."}
          mentionSuggestions={mentionSuggestions()}
          fileSuggestions={fileSuggestions()}
          onPopoverChange={setPopoverState}
        />
      </box>
    </box>
  );
}
