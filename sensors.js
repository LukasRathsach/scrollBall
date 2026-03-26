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
var startBtn, resetBtn;

// scroll mode
var reels = [
  'reels/reel.mp4',
  'reels/reel (1).mp4',
  'reels/reel (2).mp4',
];
var currentReel = 0;
var reelVideo   = null;
var scrollMode  = false;
var scrollCum   = 0;
var scrollPrev  = { x: null, y: null, z: null };
var SCROLL_THRESHOLD = 50; // degrees of total rotation to skip to next reel

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

function setup() {
  noCanvas();

  startBtn = createButton('START');
  btnStyle(startBtn, 'rgba(255,255,255,0.15)', '#fff');
  startBtn.style('left', 'calc(50% - 90px)');
  startBtn.elt.addEventListener('click', toggleCounting);
  startBtn.elt.addEventListener('touchend', function (e) { e.preventDefault(); toggleCounting(); });

  resetBtn = createButton('RESET');
  btnStyle(resetBtn, 'rgba(255,255,255,0.07)', '#fff');
  resetBtn.style('left', 'calc(50% + 10px)');
  resetBtn.elt.addEventListener('click', resetCount);
  resetBtn.elt.addEventListener('touchend', function (e) { e.preventDefault(); resetCount(); });

  var needsPermission =
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function';

  if (needsPermission) {
    btn = createButton('TAP TO START');
    btn.style('position', 'fixed');
    btn.style('top', '50%');
    btn.style('left', '50%');
    btn.style('transform', 'translate(-50%, -50%)');
    btn.style('font-size', '16px');
    btn.style('font-family', 'monospace');
    btn.style('letter-spacing', '3px');
    btn.style('background', 'rgba(255,255,255,0.12)');
    btn.style('color', 'white');
    btn.style('border', '1px solid rgba(255,255,255,0.3)');
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

function enterScrollMode() {
  scrollMode = true;
  scrollCum  = 0;
  scrollPrev = { x: rotX, y: rotY, z: rotZ };

  reelVideo = document.createElement('video');
  reelVideo.src = reels[currentReel];
  reelVideo.setAttribute('playsinline', '');
  reelVideo.setAttribute('loop', '');
  reelVideo.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;' +
    'object-fit:cover;z-index:50;background:#000;';
  document.body.appendChild(reelVideo);
  reelVideo.play().catch(function () {
    reelVideo.muted = true;
    reelVideo.play();
  });

  // hide canvas behind video
  document.querySelector('canvas').style.zIndex = '0';
}

function exitScrollMode() {
  scrollMode = false;
  if (reelVideo) {
    reelVideo.pause();
    document.body.removeChild(reelVideo);
    reelVideo = null;
  }
  document.querySelector('canvas').style.zIndex = '';
}

function switchReel() {
  currentReel = (currentReel + 1) % reels.length;
  if (reelVideo) {
    reelVideo.src = reels[currentReel];
    reelVideo.play().catch(function () {
      reelVideo.muted = true;
      reelVideo.play();
    });
  }
  scrollCum  = 0;
  scrollPrev = { x: rotX, y: rotY, z: rotZ };
}

function toggleCounting() {
  if (scrollMode) {
    counting = false;
    exitScrollMode();
    startBtn.html('START');
    btnStyle(startBtn, 'rgba(255,255,255,0.15)', '#fff');
    startBtn.style('left', 'calc(50% - 90px)');
    startBtn.style('z-index', '5');
  } else {
    counting = true;
    prevAngle.x = rotX; prevAngle.y = rotY; prevAngle.z = rotZ;
    enterScrollMode();
    startBtn.html('STOP');
    btnStyle(startBtn, 'rgba(255,100,100,0.35)', '#fff');
    startBtn.style('left', 'calc(50% - 45px)');
    startBtn.style('z-index', '60');
  }
}

function startSensors() {
  setupOrientation(0);
  setupMotion(0);
  if (btn) btn.remove();
}

function draw() {
  // --- SENSOR UPDATES ---
  if (orientationSensor.hasNewValue) {
    let gyro = orientationSensor.get();
    rotX = gyro.alpha; rotY = gyro.beta; rotZ = gyro.gamma;

    if (counting) {
      if (prevAngle.x === null) {
        prevAngle.x = rotX; prevAngle.y = rotY; prevAngle.z = rotZ;
      } else {
        let dx = shortestAngle(prevAngle.x, rotX, 360);
        let dy = shortestAngle(prevAngle.y, rotY, 360);
        let dz = shortestAngle(prevAngle.z, rotZ, 180);
        prevAngle.x = rotX; prevAngle.y = rotY; prevAngle.z = rotZ;

        let adx = abs(dx), ady = abs(dy), adz = abs(dz);
        if (adx > 0.4 || ady > 0.4 || adz > 0.4) {
          if (adx >= ady && adx >= adz)      totalAngle.x += dx;
          else if (ady >= adx && ady >= adz) totalAngle.y += dy;
          else                               totalAngle.z += dz;
        }

        let prevX = confirmedCount.x, prevY = confirmedCount.y, prevZ = confirmedCount.z;
        confirmedCount.x = updateHysteresis(totalAngle.x, confirmedCount.x, 360);
        confirmedCount.y = updateHysteresis(totalAngle.y, confirmedCount.y, 360);
        confirmedCount.z = updateHysteresis(totalAngle.z, confirmedCount.z, 360);

        if (scrollMode && (confirmedCount.x !== prevX || confirmedCount.y !== prevY || confirmedCount.z !== prevZ)) {
          switchReel();
        }
      }
    }
  }

  if (motionSensor.hasNewValue) {
    let motion = motionSensor.get();
    accX = motion.x; accY = motion.y; accZ = motion.z;
    speed = sqrt(accX * accX + accY * accY + accZ * accZ);
  }

}
