const btnStart = $("#btn-start");
const btnStop  = $("#btn-stop");
const btnSpeak = $("#btn-speak");

btnStart.addEventListener("click", async () => {
  btnStart.disabled = true;
  setStatus("初期化中…");
  await UrbanAI.start();
  setStatus("");
  btnStop.disabled = false;
});

btnStop.addEventListener("click", async () => {
  btnStop.disabled = true;
  await UrbanAI.stop();
  btnStart.disabled = false;
});

btnSpeak.addEventListener("click", () => {
  UrbanAI.testSpeak();
});
