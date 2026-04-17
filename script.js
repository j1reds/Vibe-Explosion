const canvas = document.getElementById("canvas"); // Canvas
const ctx = canvas.getContext("2d"); // Canvasの描画コンテキスト

canvas.width = window.innerWidth; // Canvasを画面全体に広げる
canvas.height = window.innerHeight; // Canvasを画面全体に広げる
let beatT = 0; // リズム用の時間カウンタ
let t = 0; // 背景ゆらぎ用タイムカウンタ
let bgBeat = 0; // 背景のリズム用カウンタ
let bioT = 0; // 爆発円の生物的ゆらぎ（sinノイズ）

// --- パーティクル用 ---
class Particle {
  constructor(x, y, volume) {
    this.x = x; // 発生位置の x 座標
    this.y = y; // 発生位置の y 座標
    this.angle = Math.random() * Math.PI * 2; // ランダムな飛び散る方向
    this.speed = Math.random() * 4 + 2 + volume / 20; // 音量に応じて速度を強化

    // 生物 × 爆発のハイブリッド速度
      const v = volume / 255; // 音量を 0〜1 に正規化

    // 生物的な穏やかな速度
    const smoothSpeed = 1.2 + v * 1.8; // 音量に応じて穏やかな速度を強化

    // 爆発的な速度
    const burstSpeed = (Math.random() + 0.7) * v * 10; // 爆発的な速度を強化

    // 音量が小さいときは smooth、大きいときは burst が勝つ
    this.speed = smoothSpeed * (1 - v) + burstSpeed * v; // 音量に応じて速度をブレンド

    this.size = Math.random() * 3 + 1; // パーティクルのサイズ
    this.life = 180; // パーティクルの寿命（フレーム数）
    // パーティクルの色を音量に応じて変化させる（黄色〜緑の範囲で変化）
    this.color = `hsl(${60 + volume * 0.6}, 90%, 60%)`;
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed; // パーティクルの位置を更新
    this.y += Math.sin(this.angle) * this.speed; // パーティクルの位置を更新
    this.life--; // パーティクルの寿命を減らす
  }

  draw() {
    ctx.fillStyle = this.color; // パーティクルの色を設定
    ctx.beginPath(); // パーティクルを円で描く
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); // 円の中心をパーティクルの位置に設定
    ctx.fill(); // パーティクルを描画
  }

  // パーティクルが寿命を迎えたかどうかを判定
  isDead() {
    return this.life <= 0; // 寿命が0以下なら死んでいるとみなす
  }
}

let particles = []; // 画面上の全パーティクルを管理する配列

// --- マイク ---
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  // 音量に応じて背景の霧の濃さや広がりを変化させる
  function drawBackground(volume) {
    // 闇に溶ける紫霧
    // 中心をゆらゆら動かす
    t += 0.04; // ゆらぎ速度
    bgBeat += 0.03; // 背景のリズム速度

    // 0〜1 の音量ノーマライズ
    const v = volume / 255;
    // 音量＋周期でゆらぐ係数
    const pulse = 1 + Math.sin(bgBeat) * 0.15 + v * 0.3;

    // ゆらゆら揺れる中心位置（複合波：パターンB）
    const cx = canvas.width / 2 + (Math.sin(t) + Math.sin(t * 2) * 0.5 + Math.sin(t * 3) * 0.2) * 90;
    const cy = canvas.height / 2 + (Math.cos(t * 0.9) + Math.cos(t * 1.3) * 0.4 + Math.cos(t * 2.1) * 0.15) * 90;

    const gradient = ctx.createRadialGradient(
      cx, cy, 80 * pulse,         // 中心が揺れる、ゆらぎで半径も変化させる
      cx, cy, //canvas.width * (0.6 + Math.sin(t) * 0.05) // 周期でゆらぐ外側半径
      canvas.width * (0.6 + Math.sin(t) * 0.05 + v * 0.15) // 周期でゆらぐ＋音量で広がる外側半径
    );

    // さらに紫色も深く変化
    const fogAlpha =
      0.2 +                         // 音量で霧の濃さを変化させる基本部分
      v * 0.4 +                     // 音量で濃く
      Math.sin(bgBeat * 1.5) * 0.1; // 音量と背景のリズムで霧の濃さが変化（周期を少し速くして、背景のリズムに合わせて揺れる感じを強調）

    gradient.addColorStop(0, `rgba(120, 0, 180, ${fogAlpha})`); // 中心の紫も音量で濃く、周期で揺らぐように変化させる
    gradient.addColorStop(1, "rgba(10, 0, 30, 1)"); // 背景の闇も少し明るくして、霧の存在感を強調（さらに暗くして、霧のコントラストを強化）

    ctx.fillStyle = gradient; // 背景をグラデーションで塗りつぶす
    ctx.fillRect(0, 0, canvas.width, canvas.height); // 背景全体を塗りつぶす
  }

  
  // 波形の“リズムの強弱”
  // 音量に応じて波形の大きさや色を変化させる
  function drawCircleWave(volume) {
    // 丸波形
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // リズム用の時間カウンタ
    beatT += 0.05;
    const beat = (Math.sin(beatT) + 1) / 2;  // 0〜1 の緩やかな周期
    const beatPower = 1 + beat * 0.4;        // 波形の“強弱”係数
    const baseRadius = 110 + volume * 0.6; // 基本の半径は音量に連動させつつ脈動は少し抑える
    // beatPower を直接半径に掛けるのではなく、後のレイヤーで誇張演出するため、ここでは基本半径のみを使用
    const radius = baseRadius;

    // 波形の色を音量に応じて変化させる（音量が大きいほど明るく）
    // volume に連動して hue が変化（200=青 → 260=青紫など）
    const hue = 200 + volume * 0.3; // 音量が大きいほど hue が高くなり、より紫寄りに変化
    // 色相を音量に連動させつつ、全体の明るさも少し上げる
    ctx.strokeStyle = `hsla(${hue}, 80%, 65%, 0.45)`;

    ctx.lineWidth = 4; // 波形の線の太さを少し太くして、存在感を強化
    ctx.beginPath(); // 基本の波形を描く
    ctx.arc(cx, cy, radius, 0, Math.PI * 2); // 基本の波形は音量に連動した半径で描く
    ctx.stroke(); // 基本の波形を描く
    // 誇張演出:5レイヤ波形
    for (let i = 0; i < 5; i++) {
      // 波形の半径を外側に広げる
      // 波形にも“ゆらぎ”を加える
      const dynamicOffset = Math.sin(t * 0.5 + i) * 5;
      // 基本の半径に beatPower を掛けるのではなく、レイヤーごとに誇張演出するため、ここで beatPower を掛ける
      const waveRadius = (140 + i * 30 + dynamicOffset + volume * (0.3 + i * 0.2)) * beatPower;
      
      // 波形の色もレイヤーごとに変化させる（外側ほど淡く）
      const hue = 200 + volume * 0.3 + i * 6; 
      ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.2 + volume / 500 + i * 0.3})`;

      ctx.lineWidth = 1 + i * 0.5; // レイヤーごとに線の太さを変える

      ctx.beginPath(); // 波形を描く
      ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2); // 波形の半径を外側に広げる
      ctx.stroke(); // 波形を描く
    }

  }

  // 爆発の円
  function drawExplosionCircle(volume) {
    const cx = canvas.width / 2; // 爆発の中心 x 座標
    const cy = canvas.height / 2; // 爆発の中心 y 座標
    bioT += 0.04; // 生物的ゆらぎの時間カウンタ

    // ギザギザの円の大きさを外側に広げる
    const baseRadius = 120 + volume * 0.9; // ギザギザ円の半径を強化
    const spikes = 60; // ギザギザの数を増やす
    
    // 無音で黄色、音量MAXで緑
    // 中心円の hue を 120 から 90 に下げて、音量0時の緑を少し黄色寄りにシフト
    ctx.fillStyle = `hsl(${90 - volume * 0.6}, 100%, 60%)`;

    ctx.beginPath(); // ギザギザの円を描く
    for (let i = 0; i < spikes; i++) { // 円周上に spikes 個の点を配置
      const angle = (i / spikes) * Math.PI * 2; // 円周上の角度
      // ギザギザの激しさを外側に広げる
      // const noise = (Math.random() - 0.5) * volume * 1.1;
      const noise = (Math.random() - 0.5) * volume * 2.2; // ノイズも強化（破裂のインパクト）
      const r = baseRadius + noise; // 半径にノイズを加えることで、ギザギザの形状をランダムに変化させる

      const x = cx + Math.cos(angle) * r; // 円周上の点の x 座標
      const y = cy + Math.sin(angle) * r; // 円周上の点の y 座標

      if (i === 0) ctx.moveTo(x, y); // 最初の点に移動
      else ctx.lineTo(x, y); // 2点目以降は線を引く
    }
    ctx.closePath(); // 最後の点と最初の点をつなげて円を閉じる
    ctx.fill(); // ギザギザの円を塗りつぶす
  }

  // パーティクルの生成
  function spawnParticles(volume) {
    const cx = canvas.width / 2; // 爆発の中心 x 座標
    const cy = canvas.height / 2; // 爆発の中心 y 座標

    // 生物 × 爆発のハイブリッド
    const v = volume / 255; // 音量を 0〜1 に正規化
    const baseCount = 6; // 基本のパーティクル数を少し増やす
    const burstCount = v * 80;// 音量に応じて爆発的に増えるパーティクル数を強化
    const count = Math.floor(baseCount + burstCount); // 音量が大きいほど多くのパーティクルを生成する

    const r = 40; // パーティクルの初期位置を中心から少し離すための半径
    const angle = Math.random() * Math.PI * 2; // ランダムな角度でパーティクルを発生させる
    const px = cx + Math.cos(angle) * r; // パーティクルの初期 x 座標
    const py = cy + Math.sin(angle) * r; // パーティクルの初期 y 座標
    
    particles.push(new Particle(px, py, volume)); // 最初のパーティクルは中心から少し離れた位置に発生させる

    for (let i = 0; i < count; i++) { // 音量に応じて多くのパーティクルを生成する
      particles.push(new Particle(cx, cy, volume)); // パーティクルのコンストラクタに volume を渡す
    }
  }

  // パーティクルの更新と描画
  function updateParticles() { // 寿命が尽きたパーティクルを配列から削除
    particles = particles.filter(p => !p.isDead()); // 寿命が尽きていないパーティクルだけを残す
    for (let p of particles) { // 全パーティクルを更新して描画
      p.update(); // パーティクルの位置を更新
      p.draw(); // パーティクルを描画
    }
  }

  // アニメーションループ
  function animate() {
    // fade-out （残像を少し残す）
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // 黒で塗りつぶす際の透明度を上げて、残像を強調
    ctx.fillRect(0, 0, canvas.width, canvas.height); // 画面全体を塗りつぶす

    requestAnimationFrame(animate); // 次のフレームで animate 関数を呼び出す

    analyser.getByteFrequencyData(dataArray); // 周波数データを取得して dataArray に格納する

    let sum = 0; // 周波数データの合計を計算する
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]; // 周波数データの合計を計算する
    const volume = sum / dataArray.length; // 0 ~ 255

    drawBackground(volume); // 音量に応じて背景を描画する
    drawCircleWave(volume); // 音量に応じて波形を描画する
    drawExplosionCircle(volume); // 音量に応じて爆発の円を描画する
    spawnParticles(volume); // 音量に応じてパーティクルを生成する
    updateParticles(); // パーティクルを更新して描画する
  }

  animate(); // アニメーションを開始する
});
