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

// rotation counting
var counting = false;
var rotCount = { x: 0, y: 0, z: 0 };
var cumAngle = { x: 0, y: 0, z: 0 };
var prevAngle = { x: null, y: null, z: null };

// returns shortest signed difference between two angles,
// wrap is the full range (360 for alpha/beta, 180 for gamma)
function shortestAngle(prev, curr, wrap) {
  let d = curr - prev;
  let h = wrap / 2;
  while (d > h) d -= wrap;
  while (d < -h) d += wrap;
  return d;
}

function resetCount() {
  rotCount = { x: 0, y: 0, z: 0 };
  cumAngle = { x: 0, y: 0, z: 0 };
  prevAngle = { x: null, y: null, z: null };
}

function btnStyle(b, bg, fg) {
  b.style('font-size', '18px');
  b.style('font-family', 'monospace');
  b.style('background', bg);
  b.style('color', fg);
  b.style('border', '1px solid #555');
  b.style('padding', '12px 28px');
  b.style('cursor', 'pointer');
  b.style('margin', '8px 8px 0 0');
}

function setup() {
  createCanvas(windowWidth, 680);
  textFont('monospace');

  // real HTML buttons — always tappable on mobile
  startBtn = createButton('START');
  btnStyle(startBtn, '#32c832', '#000');
  startBtn.mousePressed(toggleCounting);

  resetBtn = createButton('RESET');
  btnStyle(resetBtn, '#555', '#fff');
  resetBtn.mousePressed(function () { resetCount(); });

  // on desktop/Android sensors start automatically
  // on iOS a real button tap is required to trigger the permission dialog
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
    btn.mousePressed(startSensors);
  } else {
    startSensors();
  }
}

function toggleCounting() {
  counting = !counting;
  startBtn.html(counting ? 'STOP' : 'START');
  btnStyle(startBtn, counting ? '#c83232' : '#32c832', '#000');
}

// Starter sensoren når knappen bliver trykket på
function startSensors() {
  setupOrientation(0);
  setupMotion(0);
  if (btn) btn.remove();
}

function draw() {
  background(0);

  // hvis sensor opdager noget nyt så se lige hvad det er
  if (orientationSensor.hasNewValue) {
    let gyro = orientationSensor.get();
    rotX = gyro.alpha;
    rotY = gyro.beta;
    rotZ = gyro.gamma;

    // cumulative angle tracking — sum up small steps and divide by 360
    if (counting) {
      if (prevAngle.x === null) {
        prevAngle.x = rotX;
        prevAngle.y = rotY;
        prevAngle.z = rotZ;
      } else {
        cumAngle.x += shortestAngle(prevAngle.x, rotX, 360); // alpha: 0-360
        cumAngle.y += shortestAngle(prevAngle.y, rotY, 360); // beta: -180 to 180
        cumAngle.z += shortestAngle(prevAngle.z, rotZ, 180); // gamma: -90 to 90 (limited!)

        prevAngle.x = rotX;
        prevAngle.y = rotY;
        prevAngle.z = rotZ;

        rotCount.x = Math.trunc(cumAngle.x / 360);
        rotCount.y = Math.trunc(cumAngle.y / 360);
        rotCount.z = Math.trunc(cumAngle.z / 180); // 180 = max gamma range
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

  // lidt design med tekst, baggrund osv.
  fill(255);
  noStroke();
  textSize(18);

  let lh = 34;
  let x = 30;
  let y = 60;

  text('ROTATION', x, y);
  text('x  ' + nf(rotX, 1, 1), x, y + lh * 1);
  text('y  ' + nf(rotY, 1, 1), x, y + lh * 2);
  text('z  ' + nf(rotZ, 1, 1), x, y + lh * 3);

  text('ACCELERATION', x, y + lh * 5);
  text('x  ' + nf(accX, 1, 1), x, y + lh * 6);
  text('y  ' + nf(accY, 1, 1), x, y + lh * 7);
  text('z  ' + nf(accZ, 1, 1), x, y + lh * 8);

  text('SPEED', x, y + lh * 10);
  text(nf(speed, 1, 2), x, y + lh * 11);

  // rotation count display
  text('ROTATIONS', x, y + lh * 13);
  text('x  ' + rotCount.x, x, y + lh * 14);
  text('y  ' + rotCount.y, x, y + lh * 15);
  text('z  ' + rotCount.z + '  (limited)', x, y + lh * 16);
}
