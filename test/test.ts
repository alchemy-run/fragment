import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import * as Chat from "@effect/ai/Chat";
import * as Persistence from "@effect/experimental/Persistence";
import { FetchHttpClient, FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import * as PlatformConfigProvider from "@effect/platform/PlatformConfigProvider";
import { it as bunIt } from "bun:test";
import { ConfigProvider, LogLevel } from "effect";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import { LSPManagerLive } from "../src/lsp/index.ts";
import { LibsqlSqlite, sqliteStateStore } from "../src/state/index.ts";

const lspLayer = LSPManagerLive([]);

const platform = Layer.mergeAll(
  Layer.provideMerge(
    Layer.provide(sqliteStateStore(), LibsqlSqlite),
    NodeContext.layer,
  ),
  FetchHttpClient.layer,
  Logger.pretty,
  Persistence.layerMemory,
  lspLayer,
);


// Use Effect.Effect.Any to accept any Effect type
type TestCase =
  | Effect.Effect<unknown, any, any>
  | (() => Effect.Effect<unknown, any, any>);

export function test(
  name: string,
  options: { timeout?: number },
  testCase: TestCase,
): void;

export function test(name: string, testCase: TestCase): void;

export function test(
  name: string,
  ...args: [{ timeout?: number }, TestCase] | [TestCase]
) {
  const [options = {}, testCase] =
    args.length === 1 ? [undefined, args[0]] : args;

  return bunIt(
    name,
    async () => {
      // Check if testCase is an Effect or a function returning an Effect
      const effect = Effect.isEffect(testCase)
        ? testCase
        : (testCase as () => Effect.Effect<unknown, any, any>)();
      await Effect.runPromise(
        Effect.scoped(provideTestEnv(effect)) as Effect.Effect<void>,
      );
    },
    { timeout: options.timeout ?? 120_000 },
  );
}

test.skip = function (
  name: string,
  ...args: [{ timeout?: number }, TestCase] | [TestCase]
) {
  const [options = {}] = args.length === 1 ? [undefined] : args;
  return bunIt.skip(name, () => {}, { timeout: options.timeout ?? 120_000 });
};

/**
 * Simple wrapper around bun:test's it() for running Effect tests.
 * This mimics @effect/vitest's it.effect() pattern.
 */
export const it = Object.assign(bunIt, {
  effect: function (
    name: string,
    fn: () => Effect.Effect<any, any, any>,
    timeout?: number,
  ) {
    return bunIt(
      name,
      async () => {
        await Effect.runPromise(fn() as Effect.Effect<void>);
      },
      { timeout: timeout ?? 60_000 },
    );
  },
});

/** Provide common layers and services to an effect */
function provideTestEnv(effect: Effect.Effect<unknown, any, any>) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Load .env if it exists
    let configProvider = ConfigProvider.fromEnv();
    if (yield* fs.exists(".env")) {
      configProvider = ConfigProvider.orElse(
        yield* PlatformConfigProvider.fromDotEnv(".env"),
        ConfigProvider.fromEnv,
      );
    }

    // Model setup - needs to be inside the effect so config is available
    const Anthropic = AnthropicClient.layerConfig({
      apiKey: Config.redacted("ANTHROPIC_API_KEY"),
    });
    const claude = AnthropicLanguageModel.model("claude-haiku-4-5");
    const modelLayer = Layer.provideMerge(claude, Anthropic);

    const chatLayer = Chat.layerPersisted({
      storeId: "test",
    });

    return yield* effect.pipe(
      Effect.provide(chatLayer),
      Effect.provide(modelLayer),
      Effect.withConfigProvider(configProvider),
    );
  }).pipe(
    Effect.provide(platform),
    Logger.withMinimumLogLevel(
      process.env.DEBUG ? LogLevel.Debug : LogLevel.Info,
    ),
  );
}
