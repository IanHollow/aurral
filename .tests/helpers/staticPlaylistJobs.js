const sameTrack = (left, right) =>
  String(left?.artistName || "").toLowerCase() === String(right?.artistName || "").toLowerCase() &&
  String(left?.trackName || "").toLowerCase() === String(right?.trackName || "").toLowerCase();

// Queue Library jobs for tracks of a static playlist and point its memberships at them,
// adding a membership for any track the playlist does not list yet.
export function addStaticPlaylistJobs({ downloadTracker, flowPlaylistConfig }, playlistId, tracks) {
  const jobIds = tracks.map((track) => downloadTracker.addJob(track, "library", { queuedForPlaylist: true }));
  const nextTracks = flowPlaylistConfig.getStaticPlaylist(playlistId).tracks.map((track) => ({ ...track }));
  tracks.forEach((track, index) => {
    const membership = nextTracks.find((entry) => !entry.canonicalJobId && sameTrack(entry, track));
    if (membership) membership.canonicalJobId = jobIds[index];
    else nextTracks.push({ ...track, canonicalJobId: jobIds[index] });
  });
  flowPlaylistConfig.updateStaticPlaylist(playlistId, { tracks: nextTracks });
  return jobIds;
}
