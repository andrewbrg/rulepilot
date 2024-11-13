export class Logger {
  static debug(...opts: any[]): void {
    if ("true" !== process.env.DEBUG) return;
    console.debug(...opts);
  }

  /**
   * Formats text with color.
   * @param text The text to colorize.
   * @param color The color to apply.
   */
  static color(text: unknown, color: "r" | "g" | "b" | "y" | "m"): string {
    if ("r" === color) return `\x1b[31m${text}\x1b[0m`;
    if ("g" === color) return `\x1b[32m${text}\x1b[0m`;
    if ("y" === color) return `\x1b[33m${text}\x1b[0m`;
    if ("b" === color) return `\x1b[34m${text}\x1b[0m`;
    if ("m" === color) return `\x1b[35m${text}\x1b[0m`;

    return text.toString();
  }

  /**
   * Formats text as bold.
   * @param text The text to bold.
   */
  static bold(text: unknown): string {
    return `\x1b[1m${text}\x1b[0m`;
  }
}
