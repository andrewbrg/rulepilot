export class Logger {
  static debug(...message: any): void {
    if (!process.env.DEBUG) return;
    console.debug(message);
  }
}
