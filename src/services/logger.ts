export class Logger {
  static debug(...opts: any[]): void {
    if ("true" !== process.env.DEBUG) return;
    console.debug(...opts);
  }
}
