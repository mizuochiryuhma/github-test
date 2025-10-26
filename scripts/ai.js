// ---- 設定 ----
const TM_URL = "https://teachablemachine.withgoogle.com/models/K5ktd-aIl/";
const PREDICTION_CONF_THRESH = 0.8;
const WEBCAM_SIZE = 224;
// --------------

// 状態
let model, webcam, maxPredictions;
let stopFlag = false;
let running = false;

async function loadModel() {
  const modelURL = TM_URL + "model.json";
  const metadataURL = TM_URL + "metadata.json";
  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
}

async function setupWebcam() {
  webcam = new tmImage.Webcam(WEBCAM_SIZE, WEBCAM_SIZE, true);
  await webcam.setup({ facingMode: "environment" }).catch((e) => {
    setStatus("カメラ権限が許可されていません。ブラウザ設定をご確認ください。");
    throw e;
  });
  await webcam.play();
  $("#webcam-container").appendChild(webcam.canvas);
}

async function predictOnce() {
  const prediction = await model.predict(webcam.canvas);
  let highestProb = 0;
  let bestLabel = "";
  for (let i = 0; i < prediction.length; i++) {
    if (prediction[i].probability > highestProb) {
      highestProb = prediction[i].probability;
      bestLabel = prediction[i].className;
    }
  }

  setLabel(`${bestLabel}（${(highestProb * 100).toFixed(1)}%）`);

  if (highestProb > PREDICTION_CONF_THRESH) {
    if (bestLabel === "高銅") {
      speak("宝のやま〜");
    } else if (bestLabel === "低銅") {
      speak("やめとき〜");
    } else {
      speak("ちょっとよくわからない");
    }
  }
}

async function loop() {
  if (stopFlag || !webcam) return;
  webcam.update();

  try {
    await predictOnce();
  } catch (e) {
    // まれな推論例外は握りつぶして継続
    // console.error(e);
  }

  // 必要に応じて軽く間引きしたい場合は sleep(50) など
  window.requestAnimationFrame(loop);
}

// ---- 公開API ----
window.UrbanAI = {
  async start() {
    if (running) return;
    stopFlag = false;
    setLabel("モデル読み込み中…");
    setStatus("");

    try {
      await loadModel();
      await setupWebcam();

      speak("AIを起動しました");
      setLabel("推論を開始します…");
      running = true;
      window.requestAnimationFrame(loop);
    } catch (e) {
      setStatus("初期化でエラーが発生しました。ページを再読み込みしてください。");
      console.error(e);
    }
  },

  async stop() {
    stopFlag = true;
    cancelSpeak();
    try {
      if (webcam) {
        await webcam.stop();
        if (webcam.canvas?.parentNode) {
          webcam.canvas.parentNode.removeChild(webcam.canvas);
        }
      }
    } finally {
      webcam = null;
      model = null;
      running = false;
      setLabel("待機中…");
      setStatus("");
      speak("AIを終了します");
    }
  },

  testSpeak() {
    speak("こんにちは、テストです。");
  }
};
