import { processWorkerFiles, type WorkerMessage, type WorkerPayload } from './workerProcessor';
export type { ImportConfidence, ImportSummary, WorkerFilePayload, WorkerMessage, WorkerPayload } from './workerProcessor';

const ctx: Worker = self as any;

function postWorkerMessage(message: WorkerMessage): void {
  ctx.postMessage(message);
}

ctx.onmessage = async (e: MessageEvent) => {
  await processWorkerFiles(e.data as WorkerPayload, postWorkerMessage);
};
