
const playButtons = document.querySelectorAll(".play-button");

playButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const track = button.closest(".track");
    const title = track.querySelector("h3").textContent;

    alert(
      `You selected: ${title}\n\nAudio will be connected in the next step.`
    );
  });
});
