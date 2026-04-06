// マイク入力を取得
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const circle = document.querySelector('.circle');

  function animate() {
    requestAnimationFrame(animate);

    analyser.getByteFrequencyData(dataArray);

    // 全体の音量の平均を取る
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const volume = sum / dataArray.length; // 0〜255

    // 円の縮尺 → 1〜3倍ぐらい
    // const scale = 1 + (volume / 255) * 2;
    const scale = 1 + (volume / 255) * 5;
    circle.style.transform = `scale(${scale})`;
  }

  animate();
}).catch(err => {
  console.error("マイクの利用が拒否されました:", err);
});