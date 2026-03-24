// displayed values (smoothed)
var rotX = 0;
var rotY = 0;
var rotZ = 0;
var accX = 0;
var accY = 0;
var accZ = 0;
var speed = 0;

// target values (raw from sensor)
var targetRotX = 0;
var targetRotY = 0;
var targetRotZ = 0;
var targetAccX = 0;
var targetAccY = 0;
var targetAccZ = 0;
var targetSpeed = 0;

const smoothing = 0.15;

var btn;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');

  btn = createButton('TAP TO START');
  btn.style('position', 'absolute');
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
  btn.mousePressed(startSensors);
}

function startSensors() {
  setupOrientation(0);
  setupMotion(20);
  btn.remove();
}

function draw() {
  background(0);

  if (orientationSensor.hasNewValue) {
    let gyro = orientationSensor.get();
    targetRotX = gyro.alpha;
    targetRotY = gyro.beta;
    targetRotZ = gyro.gamma;
  }

  if (motionSensor.hasNewValue) {
    let motion = motionSensor.get();
    targetAccX = motion.x;
    targetAccY = motion.y;
    targetAccZ = motion.z;
    targetSpeed = sqrt(targetAccX * targetAccX + targetAccY * targetAccY + targetAccZ * targetAccZ);
  }

  // lerp displayed values toward targets
  rotX = lerp(rotX, targetRotX, smoothing);
  rotY = lerp(rotY, targetRotY, smoothing);
  rotZ = lerp(rotZ, targetRotZ, smoothing);
  accX = lerp(accX, targetAccX, smoothing);
  accY = lerp(accY, targetAccY, smoothing);
  accZ = lerp(accZ, targetAccZ, smoothing);
  speed = lerp(speed, targetSpeed, smoothing);

  fill(255);
  noStroke();
  textSize(18);

  let lh = 36;
  let x = 30;
  let y = 80;

  text('ROTATION',              x, y);
  text('x  ' + nf(rotX, 1, 1), x, y + lh * 1);
  text('y  ' + nf(rotY, 1, 1), x, y + lh * 2);
  text('z  ' + nf(rotZ, 1, 1), x, y + lh * 3);

  text('ACCELERATION',          x, y + lh * 5);
  text('x  ' + nf(accX, 1, 1), x, y + lh * 6);
  text('y  ' + nf(accY, 1, 1), x, y + lh * 7);
  text('z  ' + nf(accZ, 1, 1), x, y + lh * 8);

  text('SPEED',          x, y + lh * 10);
  text(nf(speed, 1, 2), x, y + lh * 11);
}
