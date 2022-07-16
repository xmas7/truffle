const { exec } = require("child_process");
const { EOL } = require("os");
const path = require("path");

//Log a helpful message to standout in CI log noise
const Log = (msg, isErr) => {
  const fmt = msg
    .split("\n")
    .map(
      l =>
        `\t---truffle commandRunner ${isErr ? "stderr" : "stdout"}--- |\t${l}`
    )
    .join("\n");
  console.log(fmt);
};

module.exports = {
  getExecString: function () {
    return process.env.NO_BUILD
      ? `node ${path.join(__dirname, "../", "../", "../", "core", "cli.js")}`
      : `node ${path.join(__dirname, "../", "../", "build", "cli.bundled.js")}`;
  },

  /**
   * Run a truffle command as a child process and examine its output, via supplied
   * `config.logger.log`
   *
   * @param {string[]} command - the truffle command to run.
   * @param {TruffleConfig} config - Truffle config to be used for the test.
   * @param {string} debugEnv - comma separate string to pass as DEBUG env to child process. This
   *        string informs the node debug module which trace statements to execute. When set the
   *        child process' stdout and stderr are logged and will be captured in the CI log when
   *        run in CI, or in the terminal if run locally.
   *
   *        For example: "*,-develop*,-co*,-reselect*" will match all values, excluding those that
   *        start with develop, co or reselect. See https://github.com/debug-js/debug#conventions
   *
   * @returns a Promise that resolves if the child process is successful, rejects otherwise.
   */
  run: function (command, config, debugEnv = "") {
    const execString = `${this.getExecString()} ${command}`;
    const shouldLog = debugEnv.trim().length > 0;

    shouldLog && Log("CommandRunner");
    shouldLog && Log(`execString: ${execString}`);

    return new Promise((resolve, reject) => {
      let child = exec(execString, {
        cwd: config.working_directory,
        env: {
          ...process.env,
          DEBUG: debugEnv
        }
      });

      child.stdout.on("data", data => {
        data = data.toString().replace(/\n$/, "");
        shouldLog && Log(data);
        config.logger.log(data);
      });

      child.stderr.on("data", data => {
        data = data.toString().replace(/\n$/, "");
        shouldLog && Log(data, true);
        config.logger.log(data);
      });

      child.on("close", code => {
        // If the command didn't exit properly, show the output and throw.
        if (code !== 0) {
          shouldLog && Log(`errorCode: ${code}`, true);
          reject(new Error("Unknown exit code: " + code));
        }
        resolve();
      });

      if (child.error) {
        reject(child.error);
      }
    });
  },

  /**
   * This is a function to test the output of a truffle develop/console command with arguments.
   * @param {string[]} inputCommands - An array of input commands to enter when the prompt is ready.
   * @param {TruffleConfig} config - Truffle config to be used for the test.
   * @param {string} executableCommand - Truffle command to be tested (develop/console).
   * @param {string} executableArgs - Space separated arguments/options to be used with the executableCommand.
   * @param {string} displayHost - Name of the network host to be displayed in the prompt.
   * @returns a Promise
   */
  runInREPL: function ({
    inputCommands = [],
    config,
    executableCommand,
    executableArgs,
    displayHost
  } = {}) {
    const cmdLine = `${this.getExecString()} ${executableCommand} ${executableArgs}`;

    const readyPrompt =
      executableCommand === "debug"
        ? `debug(${displayHost})>`
        : `truffle(${displayHost})>`;

    let seenChildPrompt = false;
    let outputBuffer = "";

    return new Promise((resolve, reject) => {
      const child = exec(cmdLine, { cwd: config.working_directory });

      if (child.error) return reject(child.error);

      child.stderr.on("data", data => {
        config.logger.log("ERR: ", data);
      });

      child.stdout.on("data", data => {
        // accumulate buffer from chunks
        if (!seenChildPrompt) {
          outputBuffer += data;
        }

        // child process is ready for input when it displays the readyPrompt
        if (!seenChildPrompt && outputBuffer.includes(readyPrompt)) {
          seenChildPrompt = true;
          inputCommands.forEach(command => {
            child.stdin.write(command + EOL);
          });
          child.stdin.end();
        }

        config.logger.log("OUT: ", data);
      });

      child.on("close", code => {
        config.logger.log("EXIT: ", code);
        resolve();
      });
    });
  }
};
