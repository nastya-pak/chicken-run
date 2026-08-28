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

const IS_TOUCH = "ontouchstart" in window || navigator.maxTouchPoints > 0;
const MAX_SPEED = 9;
const ACCEL = 0.9;
const FRICTION = 0.9;
const CLUCK_COOLDOWN = 4000;
const WALK_THRESHOLD = 0.4;

let lastCluckTime = -Infinity;
let currentPose = "idle";

const ASSET_VERSION = "v3";
const RUN_FRAME_PATHS = [
  `chicken-run-1.png?${ASSET_VERSION}`,
  `chicken-run-2.png?${ASSET_VERSION}`,
  `chicken-run-3.png?${ASSET_VERSION}`,
  `chicken-run-4.png?${ASSET_VERSION}`,
  `chicken-run-5.png?${ASSET_VERSION}`,
];
const IDLE_FRAME_PATH = `chicken-idle.png?${ASSET_VERSION}`;
RUN_FRAME_PATHS.forEach((src) => {
  const preload = new Image();
  preload.src = src;
});

let runFrameIndex = 0;
let lastFrameSwitch = -Infinity;

function computeFleeRadius() {
  const minSide = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(90, Math.min(180, minSide * 0.4));
}

let fleeRadius = computeFleeRadius();
window.addEventListener("resize", () => {
  fleeRadius = computeFleeRadius();
});

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

const scene = document.getElementById("scene");

function handleTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  mouse.x = touch.clientX;
  mouse.y = touch.clientY;
}

function handleTouchEnd(e) {
  e.preventDefault();
  const touch = e.touches[0];
  if (touch) {
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
  } else {
    mouse.x = -9999;
    mouse.y = -9999;
  }
}

scene.addEventListener("touchstart", handleTouchMove, { passive: false });
scene.addEventListener("touchmove", handleTouchMove, { passive: false });
scene.addEventListener("touchend", handleTouchEnd, { passive: false });
scene.addEventListener("touchcancel", handleTouchEnd, { passive: false });

const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");
const hint = document.getElementById("hint");

if (IS_TOUCH) {
  hint.textContent = "Попробуй поймать курицу пальцем!";
}

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

  if (dist < fleeRadius) {
    const strength = (1 - dist / fleeRadius) * ACCEL * 3.2;
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
  const now = performance.now();

  if (pose !== currentPose) {
    currentPose = pose;
    if (pose === "idle") {
      chickenImg.src = IDLE_FRAME_PATH;
    } else {
      runFrameIndex = 0;
      lastFrameSwitch = now;
      chickenImg.src = RUN_FRAME_PATHS[runFrameIndex];
    }
  }

  if (pose === "run") {
    const frameInterval = Math.max(70, 220 - speed * 15);
    if (now - lastFrameSwitch > frameInterval) {
      lastFrameSwitch = now;
      runFrameIndex = (runFrameIndex + 1) % RUN_FRAME_PATHS.length;
      chickenImg.src = RUN_FRAME_PATHS[runFrameIndex];
    }
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

  let bobY = 0;
  let tilt = 0;
  if (pose === "run") {
    const stridePhase = now * (0.008 + speed * 0.004);
    const strideCycle = Math.abs(Math.sin(stridePhase));
    bobY = -strideCycle * 5;
    tilt = Math.sin(stridePhase) * 3 * (state.facingLeft ? -1 : 1);
  }

  chicken.style.transform =
    `translate(${state.x - size / 2}px, ${state.y - size / 2 + bobY}px) ` +
    `scaleX(${flip}) rotate(${tilt}deg)`;

  requestAnimationFrame(update);
}

requestAnimationFrame(update);
