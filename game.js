const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("gameCanvas"),
});
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.PointLight(0xffffff, 1, 200);
light.position.set(20, 40, 20);
scene.add(light);

const loader = new THREE.TextureLoader();

// Трава
const groundTexture = loader.load(
  "https://threejs.org/examples/textures/terrain/grasslight-big.jpg",
);
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(30, 30);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ map: groundTexture }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Дороги
for (let i = -160; i <= 160; i += 40) {
  const roadTexture = loader.load(
    "https://threejs.org/examples/textures/terrain/road.jpg",
  );
  roadTexture.wrapS = THREE.RepeatWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.repeat.set(20, 1);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 10),
    new THREE.MeshStandardMaterial({ map: roadTexture }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = i;
  road.position.y = 0.01;
  scene.add(road);

  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.z = i;
  stripe.position.y = 0.02;
  scene.add(stripe);
}

// Багато будинків біля доріг
const buildings = [];
const buildingTexture = loader.load(
  "https://threejs.org/examples/textures/brick_diffuse.jpg",
);
buildingTexture.wrapS = THREE.RepeatWrapping;
buildingTexture.wrapT = THREE.RepeatWrapping;

for (let x = -160; x <= 160; x += 15) {
  // щільно
  for (let z of [-60, -80, -100, 60, 80, 100]) {
    // кілька рядів біля кожної дороги
    const height = Math.random() * 30 + 15;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(12, height, 12),
      new THREE.MeshStandardMaterial({
        map: buildingTexture,
        color: new THREE.Color(Math.random(), Math.random(), Math.random()), // різні кольори
      }),
    );
    building.material.map.repeat.set(2, height / 5);
    building.position.set(x, height / 2, z);
    scene.add(building);
    buildings.push(building);
  }
}

// Небо
const skyGeo = new THREE.SphereGeometry(600, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({
  map: loader.load(
    "https://threejs.org/examples/textures/skyboxsun25degtest.png",
  ),
  side: THREE.BackSide,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Гравець
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
);
player.position.set(0, 0.5, -15);
scene.add(player);

// Камера ближче
camera.position.set(0, 7, 12);
camera.lookAt(player.position);

// Клавіші
const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

let velocityY = 0;
let isOnGround = true;

// Кулі
const bullets = [];
window.addEventListener("click", () => {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffff00 }),
  );
  bullet.position.set(
    player.position.x,
    player.position.y + 0.5,
    player.position.z,
  );
  scene.add(bullet);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  bullets.push({ mesh: bullet, dir });
});

// Анімація
function animate() {
  requestAnimationFrame(animate);

  const speed = 0.1;
  const oldPos = player.position.clone();

  if (keys["w"]) player.position.z -= speed;
  if (keys["s"]) player.position.z += speed;
  if (keys["a"]) player.position.x -= speed;
  if (keys["d"]) player.position.x += speed;

  const limit = 180;
  player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
  player.position.z = Math.max(-limit, Math.min(limit, player.position.z));

  // Колізія з будинками (гравець)
  const playerBox = new THREE.Box3().setFromObject(player);
  for (let building of buildings) {
    const buildingBox = new THREE.Box3().setFromObject(building);
    if (playerBox.intersectsBox(buildingBox)) {
      player.position.copy(oldPos);
      break;
    }
  }

  // Стрибок
  if (keys[" "] && isOnGround) {
    velocityY = 0.2;
    isOnGround = false;
  }
  if (!isOnGround) {
    player.position.y += velocityY;
    velocityY -= 0.01;
    if (player.position.y <= 0.5) {
      player.position.y = 0.5;
      velocityY = 0;
      isOnGround = true;
    }
  }

  // Кулі + колізія з будинками
  bullets.forEach((bulletObj, i) => {
    bulletObj.mesh.position.addScaledVector(bulletObj.dir, 0.5);

    const bulletBox = new THREE.Box3().setFromObject(bulletObj.mesh);
    for (let building of buildings) {
      const buildingBox = new THREE.Box3().setFromObject(building);
      if (bulletBox.intersectsBox(buildingBox)) {
        scene.remove(bulletObj.mesh);
        bullets.splice(i, 1);
        break;
      }
    }

    if (bulletObj.mesh.position.length() > 400) {
      scene.remove(bulletObj.mesh);
      bullets.splice(i, 1);
    }
  });

  // Камера ближче до гравця
  camera.position.x = player.position.x;
  camera.position.z = player.position.z + 12;
  camera.position.y = player.position.y + 7;
  camera.lookAt(player.position);

  renderer.render(scene, camera);
}
animate();
