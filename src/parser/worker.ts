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
  await processWorkerFiles(e.data, postWorkerMessage);
};
