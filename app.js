
const audioPlayer = new Audio();
const playButtons = document.querySelectorAll(".play-button");

playButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    const track = window.tracks?.[index];

    if (!track || !track.audio) {
      alert("This track has no audio file yet.");
      return;
    }

    if (
      audioPlayer.src === new URL(track.audio, location.href).href &&
      !audioPlayer.paused
    ) {
      audioPlayer.pause();
      button.textContent = "▶ Play";
      return;
    }

    audioPlayer.pause();
    audioPlayer.src = track.audio;
    audioPlayer.load();

    audioPlayer.play().then(() => {
      playButtons.forEach((b) => {
        b.textContent = "▶ Play";
      });
      button.textContent = "⏸ Pause";
    }).catch(() => {
      alert("Unable to play this track. Please check the audio URL.");
    });
  });
});

audioPlayer.addEventListener("ended", () => {
  playButtons.forEach((button) => {
    button.textContent = "▶ Play";
  });
});
