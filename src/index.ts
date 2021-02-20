import path from 'path'
import Chokidar from 'chokidar'
import { Signale } from 'signale'
import { StaticCommandContract, Storage } from 'discapp'

/**
 * Clears the Node.js cache for a certain path
 *
 * @param filePath The path
 */
function clearRequireCacheFor(filePath: string) {
  delete require.cache[require.resolve(filePath)]
}

/**
 * Updates the command in Storage
 *
 * @param logger The logger
 * @param commandPath The path of the command
 */
export function updateCommands(logger: Signale, commandPath: string) {
  clearRequireCacheFor(commandPath)

  const fixedCommandPath = path.basename(commandPath)
  const Command = Object.values(
    require(commandPath)
  )[0] as StaticCommandContract

  if (Command) {
    try {
      Command.validate()
      logger.info(`Command in '${fixedCommandPath}' was added`)
      logger.success(`Command in '${fixedCommandPath}' is ready`)
    } catch (error) {
      logger.error(
        `Command in '${fixedCommandPath}' is not valid, so it was ignored by Discapp. We recommend you to fix or remove this command.`
      )
    }
  }
}

export function watchFiles(storage: typeof Storage) {
  const config = storage.getApp().getConfig()
  const appLogger = storage.getApp().getLogger()

  /**
   * Sets the Discapp Storage to operate in development
   * mode, this way commands with repeated codes are
   * replaced instead of throwing an error.
   */
  storage.__DEV_MODE = true

  /**
   * Watch changes in the commands directory and reloads
   * or adds the command to Discapp storage.
   */
  Chokidar.watch(config.commandsDirectory, {
    ignoreInitial: true,
  })
    .on('change', (commandPath) => {
      const fixedCommandPath = path.basename(commandPath)
      const commandLogger = appLogger.scope(path.basename(commandPath))

      commandLogger.info(`Command in '${fixedCommandPath}' was changed`)
      updateCommands(commandLogger, commandPath)
    })
    .on('add', (commandPath) => {
      const fixedCommandPath = path.basename(commandPath)
      const commandLogger = appLogger.scope(fixedCommandPath)

      updateCommands(commandLogger, commandPath)
    })

  /**
   * Recommend to restart the app if changes were made
   * in the root directory.
   */
  Chokidar.watch(path.resolve('.'), {
    depth: 1,
  }).on('change', () => {
    appLogger.warn(
      "We detected changes in the root directory. \nIf you changed your '.env' or configuration files we recommend you to restart Discapp."
    )
  })
}
