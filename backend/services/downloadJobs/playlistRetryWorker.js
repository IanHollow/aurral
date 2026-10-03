import createHonkerWorker from "../honkerWorkerFactory.js";
import { getPlaylistRetryQueue } from "../honkerDb.js";
import { downloadWorker } from "./downloadWorker.js";
import { withPlaylistMutationLock } from "./mutationGuards.js";

const {
  start: startPlaylistRetryWorker,
  stop: stopPlaylistRetryWorker,
  isRunning: isPlaylistRetryWorkerRunning,
} = createHonkerWorker({
  name: "playlist-retry",
  getQueue: getPlaylistRetryQueue,
  idlePollS: 10,
  retryDelayS: 300,
  filterJob(job) {
    const ownerId = String(job.payload?.ownerId || "").trim();
    const scheduledJobId = ownerId
      ? downloadWorker.getScheduledRetryJobId(ownerId)
      : null;
    if (!ownerId || scheduledJobId !== job.id) {
      return false;
    }
    downloadWorker.markIncompleteRetryDequeued(ownerId, job.id);
    return true;
  },
  processJob: (payload) =>
    withPlaylistMutationLock(
      payload.ownerId,
      () => downloadWorker.retryIncompletePlaylist(payload.ownerId),
    ),
  onJobError(_error, job) {
    const ownerId = String(job.payload?.ownerId || "").trim();
    if (job.attempts < 4) {
      downloadWorker.restoreScheduledRetryJobId(ownerId, job.id);
    }
  },
});

export {
  startPlaylistRetryWorker,
  stopPlaylistRetryWorker,
  isPlaylistRetryWorkerRunning,
};
