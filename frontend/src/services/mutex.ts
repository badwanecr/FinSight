/** Minimal async mutex — enough for single-flight token refresh. */
export class Mutex {
  private locked = false;
  private waiters: Array<() => void> = [];

  isLocked(): boolean {
    return this.locked;
  }

  async acquire(): Promise<() => void> {
    while (this.locked) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.locked = true;
    return () => {
      this.locked = false;
      const next = this.waiters.shift();
      if (next) next();
    };
  }

  async waitForUnlock(): Promise<void> {
    while (this.locked) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
  }
}
