import { processWorkerFiles, type WorkerMessage, type WorkerPayload } from './workerProcessor';
export type { ImportConfidence, ImportSummary, WorkerFilePayload, WorkerMessage, WorkerPayload } from './workerProcessor';

interface WorkerCtx {
  postMessage(message: WorkerMessage): void;
  onmessage: ((this: WorkerCtx, ev: MessageEvent<WorkerPayload>) => unknown) | null;
}

const ctx = self as unknown as WorkerCtx;

function postWorkerMessage(message: WorkerMessage): void {
  ctx.postMessage(message);
}

ctx.onmessage = async (e) => {
  try {
    await processWorkerFiles(e.data, postWorkerMessage);
  } catch (err) {
    // An unhandled rejection here would never reach the main thread (worker
    // onerror does not reliably fire for async rejections), wedging the import
    // overlay forever. Surface it as a FATAL_ERROR the component can recover from.
    postWorkerMessage({
      type: 'FATAL_ERROR',
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
