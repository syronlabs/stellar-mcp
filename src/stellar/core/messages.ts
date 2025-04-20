import { OutputMessage } from "../../interfaces/common.interface.js";
import { FileSystemManager } from "./fileSystem.js";

export class MessagesManager extends FileSystemManager {
  protected addMessage(messages: OutputMessage[], message: string) {
    messages.push({
      type: "text",
      text: message,
    });
  }

  protected formatStdoutOutput(stdout: string): OutputMessage[] {
    return stdout.split("\n").map((line) => ({
      type: "text",
      text: line.trim(),
    }));
  }

  protected formatStderrOutput(stderr: string): OutputMessage[] {
    return stderr.split("\n").map((line) => ({
      type: "text",
      text: line.trim(),
    }));
  }

  protected formatErrorOutput(error: string): OutputMessage[] {
    return error.split("\n").map((line) => ({
      type: "text",
      text: line.trim(),
    }));
  }
}
