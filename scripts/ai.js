// ---- 設定 ----
const TM_URL = "https://teachablemachine.withgoogle.com/models/K5ktd-aIl/";
const PREDICTION_CONF_THRESH = 0.8;
const WEBCAM_SIZE = 128;
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
  setStatus("カメラ初期化中…");

  async function cleanup() {
    try { await webcam.stop(); } catch (_) {}
  }

  // 5秒待ってダメなら次へ（失敗時は必ず stop して後始末）
  async function trySetup(constraints, label) {
    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000));
      await Promise.race([webcam.setup(constraints), timeout]);
      // iOSの再生制限へのおまじない
      const v = webcam.webcam;
      if (v) { v.setAttribute("playsinline", "true"); v.muted = true; }
      return true;
    } catch (e) {
      await cleanup();
      return false;
    }
  }

  // 1) 前面 → 2) 背面 → 3) 既定値
  let ok = await trySetup({ facingMode: "user" }, "user");
  if (!ok) ok = await trySetup({ facingMode: { ideal: "environment" } }, "env");
  if (!ok) ok = await trySetup(undefined, "default");

  if (!ok) {
    setStatus("カメラ初期化に失敗しました。iPhoneの設定でChromeのカメラ許可をご確認ください。");
    throw new Error("camera setup failed");
  }

  await webcam.play();
  $("#webcam-container").appendChild(webcam.canvas);
  setStatus("");
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

    // 先にカメラ！(iOSで「読み込み中」だけに見える問題を回避)
    setLabel("カメラ準備中…");
    setStatus("カメラ権限のダイアログが出たら［許可］を選んでください。");
    try {
      await setupWebcam();                 // ← 先にカメラ
    } catch (e) {
      setStatus("カメラ初期化に失敗しました。ブラウザ設定でカメラを許可してください。");
      console.error(e);
      return;
    }

    // 次にモデル読み込み
    setLabel("モデル読み込み中…");
    setStatus("");
    try {
      await loadModel();                   // ← あとからモデル
    } catch (e) {
      setStatus("モデルの読み込みに失敗しました。通信状況をご確認の上、再読み込みしてください。");
      console.error(e);
      return;
    }

    // 準備完了
    speak("AIを起動しました");
    setLabel("推論を開始します…");
    running = true;
    window.requestAnimationFrame(loop);
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
