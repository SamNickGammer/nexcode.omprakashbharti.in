// Captures a worker URL + options without starting it, so MonacoEnvironment can
// hand the right URL to VSCode's worker factory (see services.ts).
export class Worker {
  constructor(
    public url: string | URL,
    public options?: WorkerOptions,
  ) {}
}
