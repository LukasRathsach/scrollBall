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

function btnStyle(b, bg, fg) {
  b.style('font-size', '16px');
  b.style('font-family', 'monospace');
  b.style('background', bg);
  b.style('color', fg);
  b.style('border', 'none');
  b.style('padding', '12px 28px');
  b.style('cursor', 'pointer');
  b.style('border-radius', '4px');
  b.style('position', 'fixed');
  b.style('bottom', '36px');
  b.style('z-index', '5');
}

// rotate a 3D point by beta (pitch), gamma (roll), alpha (yaw)
function rotatePoint(x, y, z, beta, gamma, alpha) {
  // roll (gamma, around Z)
  let x1 = x * cos(gamma) - y * sin(gamma);
  let y1 = x * sin(gamma) + y * cos(gamma);
  let z1 = z;
  // pitch (beta, around X)
  let x2 = x1;
  let y2 = y1 * cos(beta) - z1 * sin(beta);
  let z2 = y1 * sin(beta) + z1 * cos(beta);
  // yaw (alpha, around Y)
  let x3 = x2 * cos(alpha) + z2 * sin(alpha);
  let y3 = y2;
  let z3 = -x2 * sin(alpha) + z2 * cos(alpha);
  return [x3, y3, z3];
}

// draw one great circle defined by two orthogonal unit vectors u and v
function drawGreatCircle(cx, cy, r, ux, uy, uz, vx, vy, vz, beta, gamma, alpha) {
  let N = 80;
  for (let i = 0; i < N; i++) {
    let t1 = (i / N) * TWO_PI;
    let t2 = ((i + 1) / N) * TWO_PI;
    let [x1, y1, z1] = rotatePoint(
      ux * cos(t1) + vx * sin(t1),
      uy * cos(t1) + vy * sin(t1),
      uz * cos(t1) + vz * sin(t1),
      beta, gamma, alpha
    );
    let [x2, y2, z2] = rotatePoint(
      ux * cos(t2) + vx * sin(t2),
      uy * cos(t2) + vy * sin(t2),
      uz * cos(t2) + vz * sin(t2),
      beta, gamma, alpha
    );
    let front = (z1 + z2) / 2 > 0;
    stroke(255, front ? 150 : 35);
    strokeWeight(front ? 1.5 : 0.8);
    line(cx + x1 * r, cy + y1 * r, cx + x2 * r, cy + y2 * r);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');

  // pre-render grain once — redrawn every frame from buffer
  grainBuffer = createGraphics(windowWidth, windowHeight);
  grainBuffer.noStroke();
  for (let i = 0; i < 18000; i++) {
    let gx = random(windowWidth);
    let gy = random(windowHeight);
    grainBuffer.fill(random(180, 255), random(8, 35));
    grainBuffer.rect(gx, gy, 1, 1);
  }

  // START / STOP button
  startBtn = createButton('START');
  btnStyle(startBtn, '#32c832', '#000');
  startBtn.style('left', 'calc(50% - 90px)');
  startBtn.elt.addEventListener('click', toggleCounting);
  startBtn.elt.addEventListener('touchend', function (e) { e.preventDefault(); toggleCounting(); });

  // RESET button
  resetBtn = createButton('RESET');
  btnStyle(resetBtn, '#333', '#fff');
  resetBtn.style('left', 'calc(50% + 10px)');
  resetBtn.elt.addEventListener('click', resetCount);
  resetBtn.elt.addEventListener('touchend', function (e) { e.preventDefault(); resetCount(); });

  // DEBUG toggle button — top right corner
  debugBtn = createButton('⋮');
  debugBtn.style('position', 'fixed');
  debugBtn.style('top', '20px');
  debugBtn.style('right', '20px');
  debugBtn.style('font-size', '24px');
  debugBtn.style('background', 'transparent');
  debugBtn.style('color', 'rgba(255,255,255,0.5)');
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
    btn.style('font-size', '22px');
    btn.style('font-family', 'monospace');
    btn.style('background', 'black');
    btn.style('color', 'white');
    btn.style('border', '1px solid white');
    btn.style('padding', '16px 32px');
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
  btnStyle(startBtn, counting ? '#c83232' : '#32c832', '#000');
  startBtn.style('left', 'calc(50% - 90px)');

  if (counting) {
    prevAngle.x = rotX;
    prevAngle.y = rotY;
    prevAngle.z = rotZ;
  }
}

// Starter sensoren når knappen bliver trykket på
function startSensors() {
  setupOrientation(0);
  setupMotion(0);
  if (btn) btn.remove();
}

function draw() {
  // dark background
  background(10, 10, 18);

  // grain overlay
  image(grainBuffer, 0, 0);

  // sensor updates
  if (orientationSensor.hasNewValue) {
    let gyro = orientationSensor.get();
    rotX = gyro.alpha;
    rotY = gyro.beta;
    rotZ = gyro.gamma;

    if (counting) {
      if (prevAngle.x === null) {
        prevAngle.x = rotX;
        prevAngle.y = rotY;
        prevAngle.z = rotZ;
      } else {
        totalAngle.x += shortestAngle(prevAngle.x, rotX, 360);
        totalAngle.y += shortestAngle(prevAngle.y, rotY, 360);
        totalAngle.z += shortestAngle(prevAngle.z, rotZ, 180);

        prevAngle.x = rotX;
        prevAngle.y = rotY;
        prevAngle.z = rotZ;

        confirmedCount.x = updateHysteresis(totalAngle.x, confirmedCount.x, 360);
        confirmedCount.y = updateHysteresis(totalAngle.y, confirmedCount.y, 360);
        confirmedCount.z = updateHysteresis(totalAngle.z, confirmedCount.z, 360);
      }
    }
  }

  if (motionSensor.hasNewValue) {
    let motion = motionSensor.get();
    accX = motion.x;
    accY = motion.y;
    accZ = motion.z;
    speed = sqrt(accX * accX + accY * accY + accZ * accZ);
  }

  // --- 3D SPHERE ---
  let cx = width / 2;
  let cy = height * 0.44;
  let r = min(width, height) * 0.33;

  let beta = radians(rotY);
  let gamma = radians(rotZ);
  let alpha = radians(rotX);

  // soft glow behind sphere
  noStroke();
  for (let i = 6; i > 0; i--) {
    fill(80, 120, 220, i * 5);
    ellipse(cx, cy, (r + i * 10) * 2, (r + i * 10) * 2);
  }

  // sphere outline
  noFill();
  stroke(255, 180);
  strokeWeight(2);
  ellipse(cx, cy, r * 2, r * 2);

  // three great circles: XY, XZ, YZ planes
  drawGreatCircle(cx, cy, r, 1, 0, 0, 0, 1, 0, beta, gamma, alpha); // XY
  drawGreatCircle(cx, cy, r, 1, 0, 0, 0, 0, 1, beta, gamma, alpha); // XZ
  drawGreatCircle(cx, cy, r, 0, 1, 0, 0, 0, 1, beta, gamma, alpha); // YZ

  // ball position from orientation (beta = pitch, gamma = roll)
  let px = cos(beta) * sin(gamma);
  let py = -sin(beta);
  let pz = cos(beta) * cos(gamma);
  let [bx, by, bz] = rotatePoint(px, py, pz, 0, 0, alpha);

  let sx = cx + bx * r;
  let sy = cy + by * r;
  let dotSize = map(bz, -1, 1, 10, 22);
  let dotAlpha = map(bz, -1, 1, 80, 255);

  // dot glow
  noStroke();
  for (let i = 5; i > 0; i--) {
    fill(255, 255, 255, i * 8);
    ellipse(sx, sy, dotSize + i * 7, dotSize + i * 7);
  }
  fill(255, dotAlpha);
  ellipse(sx, sy, dotSize, dotSize);

  // --- ROTATION COUNTS (always visible) ---
  noStroke();
  fill(255, 200);
  textSize(15);
  textAlign(CENTER, BASELINE);
  let countY = height - 100;
  text(
    'x  ' + confirmedCount.x + '     y  ' + confirmedCount.y + '     z  ' + confirmedCount.z,
    cx, countY
  );
  textAlign(LEFT, BASELINE);

  // --- DEBUG PANEL ---
  if (debugMode) {
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, 195, height);

    fill(255, 180);
    textSize(13);
    let lh = 22;
    let dx = 14, dy = 50;

    text('ROTATION', dx, dy);
    text('x  ' + nf(rotX, 1, 1), dx, dy + lh);
    text('y  ' + nf(rotY, 1, 1), dx, dy + lh * 2);
    text('z  ' + nf(rotZ, 1, 1), dx, dy + lh * 3);

    text('ACCELERATION', dx, dy + lh * 5);
    text('x  ' + nf(accX, 1, 1), dx, dy + lh * 6);
    text('y  ' + nf(accY, 1, 1), dx, dy + lh * 7);
    text('z  ' + nf(accZ, 1, 1), dx, dy + lh * 8);

    text('SPEED', dx, dy + lh * 10);
    text(nf(speed, 1, 1), dx, dy + lh * 11);

    text('ROTATIONS', dx, dy + lh * 13);
    text('x  ' + confirmedCount.x, dx, dy + lh * 14);
    text('y  ' + confirmedCount.y, dx, dy + lh * 15);
    text('z  ' + confirmedCount.z, dx, dy + lh * 16);

    text('TOTAL ANGLE', dx, dy + lh * 18);
    text('x  ' + nf(totalAngle.x, 1, 0), dx, dy + lh * 19);
    text('y  ' + nf(totalAngle.y, 1, 0), dx, dy + lh * 20);
    text('z  ' + nf(totalAngle.z, 1, 0), dx, dy + lh * 21);
  }
}
