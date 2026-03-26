// laver variabler til distance

function distance3D(x0, y0, z0, x1, y1, z1) {
  let a = x1 - x0;
  let b = y1 - y0;
  let c = z1 - z0;
  let dist = Math.round(Math.sqrt(a * a + b * b + c * c));
  return dist;
}

// laver nye variabler til bevægelse
const motionFactor = 100;

var motionSensor = {
  x: 0,
  y: 0,
  z: 0,
  threshold: 0,
  hasNewValue: false,
  get: function () {
    this.hasNewValue = false;
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    }
  }
};

// laver koordinater til acceleration

var motionValues = {
  accX: 0,
  accY: 0,
  accZ: 0,
  accXOld: 0,
  accYOld: 0,
  accZOld: 0,
};

// kalkulerer bevægelse og acceleration ved at sammenligne med tidligere værdier
function doMotion(e) {
  motionValues.accX = motionFactor * e.acceleration.x;
  motionValues.accY = motionFactor * e.acceleration.y;
  motionValues.accZ = motionFactor * e.acceleration.z;

  let difference = distance3D(
    motionValues.accX, motionValues.accY, motionValues.accZ,
    motionValues.accXOld, motionValues.accYOld, motionValues.accZOld
  );

  if (difference >= motionSensor.threshold) {
    motionSensor.hasNewValue = true;

    motionSensor.x = motionValues.accX;
    motionSensor.y = motionValues.accY;
    motionSensor.z = motionValues.accZ;

    accXOld = motionValues.accX;
    accYOld = motionValues.accY;
    accZOld = motionValues.accZ;
  }
}


// Vi siger til iphone at vi ikke er farlige
function setupMotion(threshold) {

  if (typeof DeviceMotionEvent.requestPermission === 'function') {

    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          window.addEventListener("devicemotion", doMotion, false);
        }
      })
      .catch(console.error);
  }
  else {
    window.addEventListener("devicemotion", doMotion, false);
  }

  if (typeof threshold === 'number') {
    motionSensor.threshold = threshold;
  }
}

// Laver variabler til rotation

var orientationSensor = {
  x: 0,
  y: 0,
  z: 0,
  threshold: 0,
  hasNewValue: false,
  get: function () {
    this.hasNewValue = false;
    return {
      alpha: this.x,
      beta: this.y,
      gamma: this.z,
    }
  }
};

// laver variabler til gamle og nye koordinater så vi kan sammenligne
var orientationValues = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  alphaOld: 0,
  betaOld: 0,
  gammaOld: 0
};

// sammenligner variabler

function doOrientation(e) {
  orientationValues.alpha = e.alpha;
  orientationValues.beta = e.beta;
  orientationValues.gamma = e.gamma;

  let difference = distance3D(
    orientationValues.alpha, orientationValues.beta, orientationValues.gamma,
    orientationValues.alphaOld, orientationValues.betaOld, orientationValues.gammaOld
  );

  if (difference >= orientationSensor.threshold) {
    orientationSensor.hasNewValue = true;

    orientationSensor.x = orientationValues.alpha;
    orientationSensor.y = orientationValues.beta;
    orientationSensor.z = orientationValues.gamma;

    orientationValues.alphaOld = orientationValues.alpha;
    orientationValues.betaOld = orientationValues.beta;
    orientationValues.gammaOld = orientationValues.gamma;
  }
}

// // Vi siger til iphone at vi ikke er farlige igen
function setupOrientation(threshold) {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          window.addEventListener("deviceorientation", doOrientation, false);
        }
      })
      .catch(console.error);
  }
  else {
    window.addEventListener("deviceorientation", doOrientation, false);
  }

  if (typeof threshold === 'number') {
    orientationSensor.threshold = threshold;
  }
}


// laver variabler igen wup wup

var rotX = 0;
var rotY = 0;
var rotZ = 0;

var accX = 0;
var accY = 0;
var accZ = 0;
var speed = 0;

var btn;
var startBtn, resetBtn, debugBtn;
var debugMode = false;
var grainBuffer;

// rotation counting
var counting = false;
var totalAngle = { x: 0, y: 0, z: 0 };
var prevAngle = { x: null, y: null, z: null };
var confirmedCount = { x: 0, y: 0, z: 0 };

// returns shortest signed difference between two angles,
// wrap is the full range (360 for alpha/beta, 180 for gamma)
function shortestAngle(prev, curr, wrap) {
  let d = curr - prev;
  let h = wrap / 2;
  while (d > h) d -= wrap;
  while (d < -h) d += wrap;
  return d;
}

// Count 10% early: trigger at 90% of a full rotation (324° instead of 360°)
var EARLY = 0.10;
// Hysteresis: counting forward is free, but reversing needs HYST degrees
// past the early-trigger boundary before the count drops.
var HYST = 20;

function getRaw(cum, full) {
  let early = full * EARLY; // 36° for full=360
  if (cum >= 0) return Math.trunc((cum + early) / full);
  else return Math.trunc((cum - early) / full);
}

function updateHysteresis(cum, confirmed, full) {
  let early = full * EARLY; // 36°
  let raw = getRaw(cum, full);
  if (raw === confirmed) return confirmed;

  if (raw > confirmed) {
    if (confirmed >= 0) {
      return confirmed + 1;             // counting positive: free
    } else {
      // uncounting from negative: boundary at confirmed*full+early (e.g. -324°)
      if (cum > confirmed * full + early + HYST) return confirmed + 1;
      return confirmed;
    }
  }

  if (raw < confirmed) {
    if (confirmed <= 0) {
      return confirmed - 1;             // counting negative: free
    } else {
      // uncounting from positive: boundary at confirmed*full-early (e.g. 324°)
      if (cum < confirmed * full - early - HYST) return confirmed - 1;
      return confirmed;
    }
  }

  return confirmed;
}

function resetCount() {
  totalAngle = { x: 0, y: 0, z: 0 };
  prevAngle = { x: null, y: null, z: null };
  confirmedCount = { x: 0, y: 0, z: 0 };
}

var bubbles = [];
var wavePhase = 0;

function btnStyle(b, bg, fg) {
  b.style('font-size', '15px');
  b.style('font-family', 'monospace');
  b.style('background', bg);
  b.style('color', fg);
  b.style('border', 'none');
  b.style('padding', '12px 28px');
  b.style('cursor', 'pointer');
  b.style('border-radius', '30px');
  b.style('position', 'fixed');
  b.style('bottom', '40px');
  b.style('z-index', '5');
  b.style('letter-spacing', '2px');
}

// one wave layer — level sets base height, tiltX tilts it left/right
function drawWaterLayer(level, tiltX, amp, freq, phase, r, g, b, a) {
  fill(r, g, b, a);
  noStroke();
  beginShape();
  vertex(-10, height + 10);
  for (let x = -10; x <= width + 10; x += 5) {
    let tilt = tiltX * ((x - width / 2) / (width / 2));
    let y = level + tilt
      + sin(x * freq       + phase)        * amp
      + sin(x * freq * 2.3 + phase * 1.6)  * amp * 0.4
      + (noise(x * 0.003, phase * 0.07) - 0.5) * amp * 0.7;
    vertex(x, y);
  }
  vertex(width + 10, height + 10);
  endShape(CLOSE);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');

  // light grain — white dots over a pale background
  grainBuffer = createGraphics(windowWidth, windowHeight);
  grainBuffer.noStroke();
  for (let i = 0; i < 22000; i++) {
    let gx = random(windowWidth);
    let gy = random(windowHeight);
    grainBuffer.fill(255, random(6, 28));
    grainBuffer.rect(gx, gy, 1, 1);
  }

  // START / STOP button
  startBtn = createButton('START');
  btnStyle(startBtn, 'rgba(255,255,255,0.25)', '#fff');
  startBtn.style('left', 'calc(50% - 90px)');
  startBtn.elt.addEventListener('click', toggleCounting);
  startBtn.elt.addEventListener('touchend', function (e) { e.preventDefault(); toggleCounting(); });

  // RESET button
  resetBtn = createButton('RESET');
  btnStyle(resetBtn, 'rgba(255,255,255,0.1)', '#fff');
  resetBtn.style('left', 'calc(50% + 10px)');
  resetBtn.elt.addEventListener('click', resetCount);
  resetBtn.elt.addEventListener('touchend', function (e) { e.preventDefault(); resetCount(); });

  // DEBUG toggle — top right
  debugBtn = createButton('⋮');
  debugBtn.style('position', 'fixed');
  debugBtn.style('top', '18px');
  debugBtn.style('right', '18px');
  debugBtn.style('font-size', '22px');
  debugBtn.style('background', 'transparent');
  debugBtn.style('color', 'rgba(255,255,255,0.4)');
  debugBtn.style('border', 'none');
  debugBtn.style('cursor', 'pointer');
  debugBtn.style('z-index', '5');
  debugBtn.elt.addEventListener('click', function () { debugMode = !debugMode; });
  debugBtn.elt.addEventListener('touchend', function (e) { e.preventDefault(); debugMode = !debugMode; });

  // iOS permission button
  var needsPermission =
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function';

  if (needsPermission) {
    btn = createButton('TAP TO START');
    btn.style('position', 'fixed');
    btn.style('top', '50%');
    btn.style('left', '50%');
    btn.style('transform', 'translate(-50%, -50%)');
    btn.style('font-size', '18px');
    btn.style('font-family', 'monospace');
    btn.style('letter-spacing', '3px');
    btn.style('background', 'rgba(255,255,255,0.15)');
    btn.style('color', 'white');
    btn.style('border', '1px solid rgba(255,255,255,0.4)');
    btn.style('padding', '16px 32px');
    btn.style('border-radius', '30px');
    btn.style('cursor', 'pointer');
    btn.style('z-index', '10');
    btn.elt.addEventListener('click', startSensors);
    btn.elt.addEventListener('touchend', function (e) { e.preventDefault(); startSensors(); });
  } else {
    startSensors();
  }
}

function toggleCounting() {
  counting = !counting;
  startBtn.html(counting ? 'STOP' : 'START');
  btnStyle(startBtn,
    counting ? 'rgba(255,100,100,0.35)' : 'rgba(255,255,255,0.25)',
    '#fff'
  );
  startBtn.style('left', 'calc(50% - 90px)');

  if (counting) {
    prevAngle.x = rotX;
    prevAngle.y = rotY;
    prevAngle.z = rotZ;
  }
}

function startSensors() {
  setupOrientation(0);
  setupMotion(0);
  if (btn) btn.remove();
}

function draw() {
  // sensor updates
  if (orientationSensor.hasNewValue) {
    let gyro = orientationSensor.get();
    rotX = gyro.alpha;
    rotY = gyro.beta;
    rotZ = gyro.gamma;

    if (counting) {
      if (prevAngle.x === null) {
        prevAngle.x = rotX; prevAngle.y = rotY; prevAngle.z = rotZ;
      } else {
        totalAngle.x += shortestAngle(prevAngle.x, rotX, 360);
        totalAngle.y += shortestAngle(prevAngle.y, rotY, 360);
        totalAngle.z += shortestAngle(prevAngle.z, rotZ, 180);
        prevAngle.x = rotX; prevAngle.y = rotY; prevAngle.z = rotZ;
        confirmedCount.x = updateHysteresis(totalAngle.x, confirmedCount.x, 360);
        confirmedCount.y = updateHysteresis(totalAngle.y, confirmedCount.y, 360);
        confirmedCount.z = updateHysteresis(totalAngle.z, confirmedCount.z, 360);
      }
    }
  }

  if (motionSensor.hasNewValue) {
    let motion = motionSensor.get();
    accX = motion.x; accY = motion.y; accZ = motion.z;
    speed = sqrt(accX * accX + accY * accY + accZ * accZ);
  }

  // advance wave animation
  wavePhase += 0.018;

  // water level from beta (pitch): tilt forward = water rises
  let waterLevel = map(constrain(rotY, -80, 80), -80, 80, height * 0.18, height * 0.82);
  // side tilt from gamma (roll)
  let tiltX = map(constrain(rotZ, -60, 60), -60, 60, -height * 0.22, height * 0.22);

  // wave amplitude pulses organically with noise
  let ampMod = 1 + noise(frameCount * 0.005) * 0.6;
  let amp = 14 * ampMod;

  // --- BACKGROUND: pale sky ---
  background(210, 235, 248);

  // --- WATER LAYERS (back to front) ---
  // deep layer
  drawWaterLayer(waterLevel + 28, tiltX, amp * 0.6, 0.012, wavePhase * 0.6,
    30, 100, 160, 180);
  // mid layer
  drawWaterLayer(waterLevel + 14, tiltX, amp * 0.8, 0.018, wavePhase * 0.85,
    50, 140, 200, 200);
  // surface layer
  drawWaterLayer(waterLevel, tiltX, amp, 0.025, wavePhase,
    100, 185, 230, 220);
  // foam highlight at surface
  drawWaterLayer(waterLevel - 6, tiltX, amp * 0.4, 0.04, wavePhase * 1.4,
    200, 230, 248, 120);

  // --- BUBBLES ---
  if (random() < 0.12 && bubbles.length < 28) {
    bubbles.push({
      x: random(width),
      y: waterLevel + random(40, 180),
      r: random(2, 7),
      vy: random(0.4, 1.1),
      vx: random(-0.15, 0.15),
      alpha: random(35, 90)
    });
  }
  noFill();
  strokeWeight(1);
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.y  -= b.vy;
    b.x  += b.vx + sin(frameCount * 0.04 + i) * 0.2;
    b.vx += random(-0.02, 0.02);
    stroke(255, b.alpha);
    ellipse(b.x, b.y, b.r * 2);
    if (b.y < waterLevel - b.r) bubbles.splice(i, 1);
  }

  // --- GRAIN ---
  image(grainBuffer, 0, 0);

  // --- FROSTED OVERLAY: blurry light band above waterline ---
  drawingContext.filter = 'blur(18px)';
  noStroke();
  fill(220, 238, 252, 90);
  rect(0, 0, width, waterLevel + tiltX * 0.5 + 30);
  drawingContext.filter = 'none';

  // subtle shimmer line at surface
  noFill();
  stroke(255, 255, 255, 60);
  strokeWeight(1.5);
  let shimmerY = waterLevel + tiltX * ((width / 2 - width / 2) / (width / 2));
  line(0, shimmerY, width, shimmerY + tiltX * 2);

  // --- ROTATION COUNTS ---
  noStroke();
  let textY = waterLevel - 50;
  textAlign(CENTER, BASELINE);
  textSize(13);
  fill(60, 100, 140, 180);
  text('ROTATIONS', width / 2, textY);
  textSize(22);
  fill(30, 70, 120, 220);
  text(confirmedCount.x + '   ' + confirmedCount.y + '   ' + confirmedCount.z, width / 2, textY + 32);
  textSize(11);
  fill(80, 120, 160, 140);
  text('x              y              z', width / 2, textY + 50);
  textAlign(LEFT, BASELINE);

  // --- DEBUG PANEL ---
  if (debugMode) {
    noStroke();
    fill(10, 30, 60, 210);
    rect(0, 0, 200, height);
    fill(180, 220, 245);
    textSize(12);
    let lh = 21, dx = 14, dy = 46;
    text('ROTATION',              dx, dy);
    text('x  ' + nf(rotX, 1, 1), dx, dy + lh);
    text('y  ' + nf(rotY, 1, 1), dx, dy + lh * 2);
    text('z  ' + nf(rotZ, 1, 1), dx, dy + lh * 3);
    text('ACCELERATION',          dx, dy + lh * 5);
    text('x  ' + nf(accX, 1, 1), dx, dy + lh * 6);
    text('y  ' + nf(accY, 1, 1), dx, dy + lh * 7);
    text('z  ' + nf(accZ, 1, 1), dx, dy + lh * 8);
    text('SPEED',                 dx, dy + lh * 10);
    text(nf(speed, 1, 1),        dx, dy + lh * 11);
    text('ROTATIONS',             dx, dy + lh * 13);
    text('x  ' + confirmedCount.x, dx, dy + lh * 14);
    text('y  ' + confirmedCount.y, dx, dy + lh * 15);
    text('z  ' + confirmedCount.z, dx, dy + lh * 16);
    text('TOTAL ANGLE',           dx, dy + lh * 18);
    text('x  ' + nf(totalAngle.x, 1, 0), dx, dy + lh * 19);
    text('y  ' + nf(totalAngle.y, 1, 0), dx, dy + lh * 20);
    text('z  ' + nf(totalAngle.z, 1, 0), dx, dy + lh * 21);
  }
}
