const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// サイズ調整
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// マイク入力
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function drawSpikyCircle(volume) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 基本半径
    const baseRadius = 80;
    const radius = baseRadius + volume * 1.5;

    // 背景色（音が鳴ったら黒→紫系）
    const bgAlpha = Math.min(volume / 150, 0.6);
    ctx.fillStyle = `rgba(80, 0, 100, ${bgAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 円色（青→黄色）
    const r = Math.min(255, 100 + volume * 3);
    const g = Math.min(255, 180 + volume * 2);
    const b = 50;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    ctx.beginPath();

    // ギザギザの数
    const spikes = 60;
    for (let i = 0; i < spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2;

      // ランダムノイズの強さ（音が大きいほどギザギザが激しくなる）
      const noise = (Math.random() - 0.5) * volume * 0.6;

      const dist = radius + noise;

      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }

  function animate() {
    requestAnimationFrame(animate);

    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    const volume = sum / dataArray.length; // 0~255

    drawSpikyCircle(volume);
  }

  animate();
}).catch(err => {
  console.error("マイクの利用が拒否されました:", err);
});