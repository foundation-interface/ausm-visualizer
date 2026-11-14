export class StartupTimer {
  private startTime: number;
  private lastCheckpoint: number;
  private checkpoints: { name: string; elapsed: number; delta: number }[] = [];

  constructor() {
    this.startTime = performance.now();
    this.lastCheckpoint = this.startTime;
  }

  checkpoint(name: string): void {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const delta = now - this.lastCheckpoint;
    this.checkpoints.push({ name, elapsed, delta });
    console.log(
      `[Startup] ${name}: +${delta.toFixed(0)}ms (total: ${elapsed.toFixed(0)}ms)`,
    );
    this.lastCheckpoint = now;
  }

  summary(): void {
    const total = performance.now() - this.startTime;
    console.log("\n[Startup] ========== TIMING SUMMARY ==========");
    console.log(`[Startup] Total startup time: ${total.toFixed(0)}ms`);
    console.log("[Startup] Breakdown:");

    // Sort by delta to show slowest first
    const sorted = [...this.checkpoints].sort((a, b) => b.delta - a.delta);
    sorted.forEach((cp) => {
      const pct = ((cp.delta / total) * 100).toFixed(1);
      const bar = "█".repeat(Math.round((cp.delta / total) * 20));
      console.log(
        `[Startup]   ${cp.name.padEnd(35)} ${cp.delta.toFixed(0).padStart(5)}ms (${pct.padStart(5)}%) ${bar}`,
      );
    });
    console.log("[Startup] ==========================================\n");
  }
}
