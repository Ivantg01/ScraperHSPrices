import * as log from "@std/log";

/** Setup and start the logger */
function startLogger() {
  const level = Deno.env.get("LOG_LEVEL") as log.LevelName || "DEBUG";

  log.setup({
    handlers: {
      console: new log.ConsoleHandler(level, {
        formatter: (record) => `${record.datetime.toISOString()} [${record.levelName}] ${record.msg}`,
      }),
    },
    loggers: {
      default: {
        level: level,
        handlers: ["console"],
      },
    },
  });

  const logger = log.getLogger();
  logger.info("Logger setup complete.");
  return logger;
}

export { startLogger };
