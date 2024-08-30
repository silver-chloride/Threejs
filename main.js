import * as THREE from "https://unpkg.com/three@0.126.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "https://cdn.skypack.dev/cannon-es";

const scene = new THREE.Scene();

const player = new THREE.Object3D();
scene.add(player);

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.2, 55);
const canvas = document.querySelector("#canvas");

const renderer = new THREE.WebGLRenderer({
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(0.7);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color("rgb(232,247,255)");
renderer.shadowMap.enabled = true;

scene.fog = new THREE.Fog("rgba(232,247,255,0.4)", 0.2, 55);

const planeSize = 200;
 
const loader = new THREE.TextureLoader();
const planeTexture = loader.load('resources/images/checker.png');
planeTexture.wrapS = THREE.RepeatWrapping;
planeTexture.wrapT = THREE.RepeatWrapping;
planeTexture.magFilter = THREE.NearestFilter;
planeTexture.colorSpace = THREE.SRGBColorSpace;
const repeats = planeSize / 2;
planeTexture.repeat.set(repeats, repeats);

const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
const planeMat = new THREE.MeshPhongMaterial({
  map: planeTexture,
  side: THREE.DoubleSide,
  shininess: 20
});
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
planeMesh.quaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * 0.5);
planeMesh.position.y = -1;
planeMesh.receiveShadow = true;
scene.add(planeMesh);

const physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -15, 0)
});
physicsWorld.defaultContactMaterial.restitution = 0.1;

const planeBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane()
});
planeBody.position.copy(planeMesh.position);
planeBody.quaternion.copy(planeMesh.quaternion);
physicsWorld.addBody(planeBody);

const texture = loader.load('resources/images/wall.jpg');
texture.colorSpace = THREE.SRGBColorSpace;

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshPhongMaterial({
  //color: 0x00ff80,
  //vertexShader : vShader,
  //fragmentShader : fShader
  shininess: 35,
  map : texture
});

const cube = new THREE.Mesh(geometry, material);
cube.castShadow = true;
cube.receiveShadow = true;
//scene.add(cube);

player.add(cube);
player.add(camera);

const cubeBody = new CANNON.Body({
  mass: 2,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
  position: new CANNON.Vec3(0, 3, 0)
});

physicsWorld.addBody(cubeBody);

cubeBody.velocity.setZero();
cubeBody.angularVelocity.setZero();

const light = new THREE.DirectionalLight(0xffdabc, 0.5);
light.position.set(-2, 20, 1);
light.castShadow = true;
light.shadow.camera.width = 40;
light.shadow.camera.height = 40;
light.shadow.mapSize = new THREE.Vector2(1000, 1000);
light.shadow.radius = 5;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xf7f7ff, 1.2);
scene.add(ambientLight);

camera.position.z = 4;
camera.position.y = 2;
camera.rotation.x = -0.3;

//const controls = new OrbitControls(camera, renderer.domElement);
//controls.minDistance = 1;
//controls.maxDistance = 500;



window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(0.4);
});

class TouchControls {
    constructor(radius=80, x=100, y=100) {
        this.x = x;
        this.y = window.innerHeight-y;
        this.outerRadius = radius;
        this.innerRadius = radius * 0.45;
        this.innerX = this.x;
        this.innerY = this.y;
        this.touch = null;
        this.touchId = null;
        this.controlValue = [0, 0];
        this.setupCanvas();
        this.draw();
    }

    setupCanvas() {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        
        this.canvas.width = this.outerRadius * 2;
        this.canvas.height = this.outerRadius * 2;

        this.canvas.style.position = "absolute";
        this.canvas.style.zIndex = 1000;
        this.canvas.style.left = `${this.x - this.outerRadius}px`;
        this.canvas.style.top = `${this.y - this.outerRadius}px`;

        document.body.appendChild(this.canvas);
        
        this.canvas.addEventListener("touchstart", (e) => this.touchStart(e));

        this.canvas.addEventListener("touchmove", (e) => this.touchMove(e));

        this.canvas.addEventListener("touchend", () => {
            this.isTouching = false;
            this.resetInnerPosition();
        });
        
        this.canvas.addEventListener("touchcancel", () => {
            this.isTouching = false;
            this.resetInnerPosition();
        });
    }

    updateInnerPosition(clientX, clientY) {
        const dx = clientX - this.x;
        const dy = clientY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.outerRadius - this.innerRadius) {
            this.innerX = clientX;
            this.innerY = clientY;
            this.controlValue = [dx, dy];
        } else {
            const angle = Math.atan2(dy, dx);
            this.innerX = this.x + Math.cos(angle) * (this.outerRadius - this.innerRadius);
            this.innerY = this.y + Math.sin(angle) * (this.outerRadius - this.innerRadius);
            this.controlValue = [this.innerX - this.x, this.innerY - this.y];
        }

        this.draw();
    }

    resetInnerPosition() {
        this.innerX = this.x;
        this.innerY = this.y;
        this.controlValue = [0, 0];
        this.draw();
    }

    touchMove(e) {
        for(let i=0; i<e.touches.length; i++){
            const touch = e.touches[i];

            if (touch.identifier === this.touchId) {
                this.updateInnerPosition(touch.clientX, touch.clientY);
                e.preventDefault();
            }
        }
    }

    touchStart(e) {
        this.touch = e.touches[e.touches.length-1];
        this.touchId = this.touch.identifier;
        this.isTouching = true;
        this.updateInnerPosition(this.touch.clientX, this.touch.clientY);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "rgba(200,200,200,0.3)";
        this.ctx.beginPath();
        this.ctx.arc(this.outerRadius, this.outerRadius, this.outerRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = "rgba(200,200,200,0.7)";
        this.ctx.beginPath();
        this.ctx.arc(this.innerX - this.x + this.outerRadius, this.innerY - this.y + this.outerRadius, this.innerRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

let touchControls = new TouchControls();
let rotateContorls = new TouchControls(80, window.innerWidth-100, 100);

const animate = function (time) {
  time *= 0.001;
  requestAnimationFrame(animate);

  const fowardVector = new THREE.Vector3(0, 0, 1).applyQuaternion(cube.quaternion);
  const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(cube.quaternion);

  //player.position.add(fowardVector.multiplyScalar(touchControls.controlValue[1]*0.007));
  //player.position.add(rightVector.multiplyScalar(touchControls.controlValue[0]*0.005));
  //player.rotation.y += rotateContorls.controlValue[0]*-0.0005;
  //player.rotation.x += rotateContorls.controlValue[1]*0.0005;

  physicsWorld.fixedStep();

  player.position.copy(cubeBody.position);
  cube.quaternion.copy(cubeBody.quaternion);
  
  cubeBody.velocity.x = touchControls.controlValue[0]*0.1;
  cubeBody.velocity.z = touchControls.controlValue[1]*0.1;
  player.position.copy(cubeBody.position);
  cube.quaternion.copy(cubeBody.quaternion);

  /*cubeBody.applyImpulse(
    new CANNON.Vec3(touchControls.controlValue[0]*0.02, 0, 0),
    new CANNON.Vec3(0, 0, 0)
  );*/

  renderer.render(scene, camera);
};

animate();
