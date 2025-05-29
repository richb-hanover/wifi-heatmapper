"use server";
import { exec, ExecOptions } from "child_process";
import { getLogger } from "./logger";

const logger = getLogger("server-utils");

/**
 * exexAsync - asynchronously run the command, return { stdout, stderr }
 * Trim both return value **ends** to remove the trailing newline
 * The {shell:true} option allows shell options (pipes, redirection, etc)
 * The option is set to true so that Node can use the proper command for the OS
 * @ts-expect-error avoids Typescript error (the option is typed as a string)
 * @param command to execute
 * @returns {stdout , stderr }
 */
export const execAsync = async (
  command: string,
): Promise<{ stdout: string; stderr: string }> => {
  // @ts-expect-error // "shell" is the name of the shell program
  const options: ExecOptions = { shell: true }; // Node.js finds the right binary for the OS

  return new Promise((resolve, reject) => {
    logger.trace("Executing command:", command);
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        logger.trace(`Command result: ${JSON.stringify(stdout)}`);
        resolve({ stdout: stdout.trimEnd(), stderr: stderr.trimEnd() });
      }
    });
  });
};
