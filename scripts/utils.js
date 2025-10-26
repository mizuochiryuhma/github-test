// クイックDOM
window.$ = (sel) => document.querySelector(sel);

// ラベル/ステータス
window.setLabel = (text) => { $("#label").innerText = text; };
window.setStatus = (text) => { $("#status").innerText = text || ""; };

// 小さな待機
window.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
