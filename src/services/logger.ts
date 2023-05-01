export class Logger {
  static debug(message: string): void {
    if (!process.env.DEBUG) return;
    console.debug(message);
  }
}
