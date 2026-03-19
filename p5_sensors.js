function setup() {
}


function draw() {

  if(orientationSensor.hasNewValue) 
  { 
    let gyro = orientationSensor.get();
    let alpha = gyro.alpha; // alpha, beta & gamma
    console.log(alpha);   
  }
}

const threshold = 10; 
function touchStarted() 
{ 
  setupOrientation(threshold); 
}
