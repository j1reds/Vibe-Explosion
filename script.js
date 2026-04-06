const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let t = 0; // 背景ゆらぎ用タイムカウンタ

// --- パーティクル用 ---
class Particle {
  constructor(x, y, volume) {
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    // this.speed = Math.random() * 3 + 1 + volume / 40;
    // パーティクルの飛び散る速度UP
    this.speed = Math.random() * 4 + 2 + volume / 20;
    this.size = Math.random() * 3 + 1;
    this.life = 60;
    this.color = `hsl(${60 + volume * 0.6}, 90%, 60%)`;
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.life--;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  isDead() {
    return this.life <= 0;
  }
}

let particles = [];

// --- マイク ---
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function drawBackground(volume) {
    // 闇に溶ける紫霧
    // const gradient = ctx.createRadialGradient(
    //   canvas.width / 2,
    //   canvas.height / 2,
    //   50,
    //   canvas.width / 2,
    //   canvas.height / 2,
    //   canvas.width * 0.7
    // );
    // 中心をゆらゆら動かす
    t += 0.02; // ゆらぎ速度

    // ゆらゆら揺れる中心位置
    const cx = canvas.width / 2 + Math.sin(t) * 40;
    const cy = canvas.height / 2 + Math.cos(t * 0.7) * 40;

    const gradient = ctx.createRadialGradient(
      cx, cy, 80,         // 中心が揺れる
      cx, cy, canvas.width * (0.6 + Math.sin(t) * 0.05)
    );

    // さらに紫色も深く変化
    // const blur = volume / 200;
    // gradient.addColorStop(0, `rgba(80, 0, 120, ${0.25 + blur})`);
    // gradient.addColorStop(1, "rgba(10, 0, 20, 1)");
    const fogAlpha = 0.2 + (volume / 400) + (Math.sin(t * 2) * 0.1);
    gradient.addColorStop(0, `rgba(120, 0, 180, ${fogAlpha})`);
    gradient.addColorStop(1, "rgba(20, 0, 40, 1)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawCircleWave(volume) {
    // 丸波形
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const radius = 120 + volume * 0.4;

    ctx.strokeStyle = `rgba(200, 120, 255, ${0.3 + volume / 300})`;
    ctx.lineWidth = 4;
    // ctx.beginPath();
    // ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    // ctx.stroke();
    // 誇張演出:3レイヤ波形
    for (let i = 0; i < 3; i++) {
      const waveRadius = 120 + i * 25 + volume * (0.3 + i * 0.2);

      ctx.strokeStyle = `rgba(220, 180, 255, ${0.15 + i * 0.1})`;
      ctx.lineWidth = 2 + i;

      ctx.beginPath();
      ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

  }

  function drawExplosionCircle(volume) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // ギザギザの円の大きさを外側に広げる
    // const baseRadius = 80 + volume * 0.3;
    const baseRadius = 150 + volume * 0.9; // ギザギザ円の半径を強化
    const spikes = 60;
    
    ctx.fillStyle = `hsl(${50 + volume * 0.6}, 100%, 60%)`;

    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2;
      // ギザギザの激しさを外側に広げる
      // const noise = (Math.random() - 0.5) * volume * 1.1;
      const noise = (Math.random() - 0.5) * volume * 2.2; // ノイズも強化（破裂のインパクト）
      const r = baseRadius + noise;

      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function spawnParticles(volume) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // パーティクル強化:発生量
    // const count = Math.min(10, volume / 20);
    // パーティクル発生量UP（最大 60）
    const count = Math.min(60, volume / 5);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(cx, cy, volume));
    }
  }

  function updateParticles() {
    particles = particles.filter(p => !p.isDead());
    for (let p of particles) {
      p.update();
      p.draw();
    }
  }

  function animate() {
    requestAnimationFrame(animate);

    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    const volume = sum / dataArray.length; // 0 ~ 255

    drawBackground(volume);
    drawCircleWave(volume);
    drawExplosionCircle(volume);
    spawnParticles(volume);
    updateParticles();
  }

  animate();
});