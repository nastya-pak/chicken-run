const chicken = document.getElementById("chicken");
const scoreValue = document.getElementById("scoreValue");

const state = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  vx: 0,
  vy: 0,
  facingLeft: false,
  score: 0,
  scared: false,
};

const mouse = {
  x: -9999,
  y: -9999,
};

const FLEE_RADIUS = 180;
const MAX_SPEED = 9;
const ACCEL = 0.9;
const FRICTION = 0.9;
const CLUCK_COOLDOWN = 4000;
const WALK_THRESHOLD = 0.4;

let lastCluckTime = -Infinity;
let currentPose = "idle";

const chickenImg = document.getElementById("chickenImg");

const cluckSound = new Audio("clucking-chicken.mp3");
cluckSound.preload = "auto";
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  cluckSound.volume = 1;
  cluckSound.play().catch((err) => {
    audioUnlocked = false;
    console.error("Не удалось запустить звук:", err);
  });
}

function playCluck() {
  const clip = cluckSound.cloneNode();
  clip.volume = 1;
  clip.play().catch((err) => {
    console.error("Не удалось воспроизвести кудахтанье:", err);
  });
}

window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener("mouseleave", () => {
  mouse.x = -9999;
  mouse.y = -9999;
});

const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");

startButton.addEventListener("click", () => {
  unlockAudio();
  startOverlay.classList.add("hidden");
});

function chickenSize() {
  return chicken.offsetWidth || 56;
}

function update() {
  const size = chickenSize();
  const dx = state.x - mouse.x;
  const dy = state.y - mouse.y;
  const dist = Math.hypot(dx, dy);

  if (dist < FLEE_RADIUS) {
    const strength = (1 - dist / FLEE_RADIUS) * ACCEL * 3.2;
    const nx = dist === 0 ? Math.random() - 0.5 : dx / dist;
    const ny = dist === 0 ? Math.random() - 0.5 : dy / dist;
    state.vx += nx * strength;
    state.vy += ny * strength;

    if (!state.scared) {
      state.scared = true;
      state.score += 1;
      scoreValue.textContent = state.score;

      const now = performance.now();
      if (now - lastCluckTime > CLUCK_COOLDOWN) {
        lastCluckTime = now;
        playCluck();
      }
    }
  } else {
    state.scared = false;
  }

  state.vx *= FRICTION;
  state.vy *= FRICTION;

  const speed = Math.hypot(state.vx, state.vy);
  if (speed > MAX_SPEED) {
    state.vx = (state.vx / speed) * MAX_SPEED;
    state.vy = (state.vy / speed) * MAX_SPEED;
  }

  const pose = speed > WALK_THRESHOLD ? "run" : "idle";
  if (pose !== currentPose) {
    currentPose = pose;
    chickenImg.src = pose === "run" ? "chicken-run.png" : "chicken-idle.png";
  }

  state.x += state.vx;
  state.y += state.vy;

  const margin = size / 2;
  if (state.x < margin) {
    state.x = margin;
    state.vx = Math.abs(state.vx);
  }
  if (state.x > window.innerWidth - margin) {
    state.x = window.innerWidth - margin;
    state.vx = -Math.abs(state.vx);
  }
  if (state.y < margin) {
    state.y = margin;
    state.vy = Math.abs(state.vy);
  }
  if (state.y > window.innerHeight - margin) {
    state.y = window.innerHeight - margin;
    state.vy = -Math.abs(state.vy);
  }

  if (Math.abs(state.vx) > 0.2) {
    state.facingLeft = state.vx < 0;
  }

  const flip = state.facingLeft ? 1 : -1;
  const wobble = Math.sin(performance.now() / 90) * (speed > 1 ? 6 : 0);
  chicken.style.transform =
    `translate(${state.x - size / 2}px, ${state.y - size / 2}px) ` +
    `scaleX(${flip}) rotate(${wobble * (state.facingLeft ? -1 : 1)}deg)`;

  requestAnimationFrame(update);
}

requestAnimationFrame(update);
