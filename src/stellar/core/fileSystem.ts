import fs from "fs";
import os from "os";
import path from "path";

export class FileSystemManager {
  protected platform: NodeJS.Platform;

  constructor() {
    this.platform = this.getPlatform();
  }

  protected readFile<T>(filePath: string, encoding: BufferEncoding = "binary") {
    return fs.readFileSync(filePath, encoding) as T;
  }

  protected readDir(dirPath: string): string[] {
    return fs.readdirSync(dirPath);
  }

  protected resolvePath(...args: string[]): string {
    return path.resolve(...args);
  }

  protected joinPath(...args: string[]): string {
    return path.join(...args);
  }

  protected writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content);
  }

  protected exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  protected isDirectory(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch (error) {
      return false;
    }
  }

  protected isFile(filePath: string): boolean {
    return fs.statSync(filePath).isFile();
  }

  protected getPlatform(): NodeJS.Platform {
    return os.platform();
  }

  protected getBasePath(targetPath: string, suffix?: string): string {
    return path.basename(targetPath, suffix);
  }

  protected getDirname(targetPath: string): string {
    return path.dirname(targetPath);
  }
}
