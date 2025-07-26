//import * as log from "https://deno.land/std@0.174.0/log/mod.ts";
import * as log from "@std/log";

// This could be read from an environment variable or parsed from a CLI argument:
const LOG_LEVEL = "DEBUG";

log.setup({
  handlers: {
    console: new log.ConsoleHandler(LOG_LEVEL),
  },
  loggers: {
    default: {
      level: LOG_LEVEL,
      handlers: ["console"],
    },
  },
});

// Simple default logger out of the box. You can customize it
// by overriding logger and handler named "default", or providing
// additional logger configurations. You can log any data type.
log.debug("Hello world");
log.info(123456);
log.warn(true);
log.error({ foo: "bar", fizz: "bazz" });
log.critical("500 Internal server error");
