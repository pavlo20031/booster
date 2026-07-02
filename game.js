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

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
sunLight.position.set(50, 100, 50);
scene.add(sunLight);

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

// Масив для колізій
const buildings = [];
const collidableObjects = [];

// Функція перевірки колізії
function hasCollision(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  for (let obj of collidableObjects) {
    const objBox = new THREE.Box3().setFromObject(obj);
    if (box.intersectsBox(objBox)) return true;
  }
  return false;
}

// Перевірка чи точка на дорозі
function isOnRoad(z) {
  for (let i = -160; i <= 160; i += 40) {
    if (Math.abs(z - i) < 6) return true; // ширина дороги ~12
  }
  return false;
}

// Дороги + тротуари
for (let i = -160; i <= 160; i += 40) {
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 12),
    new THREE.MeshStandardMaterial({ color: 0x333333 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = i;
  road.position.y = 0.01;
  scene.add(road);

  const sidewalkLeft = new THREE.Mesh(
    new THREE.BoxGeometry(400, 0.01, 3),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa }),
  );
  sidewalkLeft.position.set(0, 0, i - 7.5);
  scene.add(sidewalkLeft);

  const sidewalkRight = new THREE.Mesh(
    new THREE.BoxGeometry(400, 0.01, 3),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa }),
  );
  sidewalkRight.position.set(0, 0, i + 7.5);
  scene.add(sidewalkRight);
}

// Текстура фасаду
const buildingTexture = loader.load("https://threejs.org/examples/textures/brick_diffuse.jpg");
buildingTexture.wrapS = THREE.RepeatWrapping;
buildingTexture.wrapT = THREE.RepeatWrapping;
buildingTexture.repeat.set(1, 1);

// Будинки з текстурою, кольором, вікнами і дверима
function addBuilding(x, z, width, height) {
  if (isOnRoad(z)) return; // ❌ не ставимо на дорогу

  // випадковий колір фасаду
  const colors = [0xffffff, 0xffcccc, 0xccffcc, 0xccccff, 0xffffcc];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const buildingMaterial = new THREE.MeshStandardMaterial({
    map: buildingTexture,
    color: color
  });

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, width),
    buildingMaterial
  );
  building.position.set(0, height / 2, 0);

  // група для будинку + деталей
  const buildingGroup = new THREE.Group();
  buildingGroup.add(building);

  // двері (прямокутник спереду)
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(2, 4, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x654321 })
  );
  door.position.set(0, 2, width/2 + 0.25);
  buildingGroup.add(door);

  // вікна (тільки якщо не вище краю будинку)
  for (let y = 5; y < height - 2; y += 5) {   // перевірка: y < height - 2
    const windowLeft = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222 })
    );
    windowLeft.position.set(-3, y, width/2 + 0.25);
    buildingGroup.add(windowLeft);

    const windowRight = windowLeft.clone();
    windowRight.position.x = 3;
    buildingGroup.add(windowRight);
  }

  buildingGroup.position.set(x, 0, z);

  if (!hasCollision(buildingGroup)) {
    scene.add(buildingGroup);
    buildings.push(buildingGroup);
    collidableObjects.push(buildingGroup);
  }
}

// Генерація будинків
for (let x = -180; x <= 180; x += 20) {
  for (let z = -180; z <= 180; z += 20) {
    const height = Math.random() * 25 + 18; // мінімум 18, максимум ~43
    addBuilding(x, z, 12, height);
  }
}






// Дерева
function addTree(x, z) {
  if (isOnRoad(z)) return; // ❌ не ставимо на дорогу
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 3),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
  );
  trunk.position.set(x, 1.5, z);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(2, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x228b22 }),
  );
  crown.position.set(x, 4, z);

  const tree = new THREE.Group();
  tree.add(trunk);
  tree.add(crown);

  if (!hasCollision(tree)) {
    scene.add(tree);
    collidableObjects.push(tree);
  }
}
for (let i = 0; i < 100; i++) {
  const x = (Math.random() - 0.5) * 350;
  const z = (Math.random() - 0.5) * 350;
  addTree(x, z);
}

function createPlayer() {
  const playerGroup = new THREE.Group();

  // тулуб
const body = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 2, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x00aa00 }),
);
body.position.set(0, 1, 0); // ← центр тулуба на y=1
playerGroup.add(body);


  // голова
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffcc99 }),
  );
  head.position.set(0, 2.5, 0);
  playerGroup.add(head);

  // волосся
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x222222 }),
  );
  hair.position.set(0, 2.5, 0);
  playerGroup.add(hair);

  // руки
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.2, 0.4),
    armMaterial,
  );
  leftArm.position.set(-0.8, 1.2, 0);
  playerGroup.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.8;
  playerGroup.add(rightArm);

  // ноги — прикріплені до нижнього краю тулуба
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.5, 0.4),
    legMaterial,
  );

  // центр ноги = половина висоти = 0.75
  // щоб верхня точка була на y=0, ставимо центр на y=-0.75
  leftLeg.position.set(-0.3, -0.75, 0);
  playerGroup.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.3;
  playerGroup.add(rightLeg);

  playerGroup.position.set(0, 2, 0);
  return playerGroup;
}

// створюємо гравця
const player = createPlayer();
scene.add(player);




// Камера
let yaw = 0;
let pitch = 0;
const sensitivity = 0.002;

document.body.addEventListener("click", () => {
  document.body.requestPointerLock();
});
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    yaw -= event.movementX * sensitivity;
    pitch += event.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
  }
});

// Клавіші
const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// Стрибок
let velocityY = 0;
let isOnGround = true;

// Кулі
const bullets = [];
window.addEventListener("mousedown", () => {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffff00 }),
  );
  bullet.position.set(
    player.position.x + Math.sin(yaw) * 1.2,
    player.position.y + 1.5,
    player.position.z + Math.cos(yaw) * 1.2,
  );

  const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  scene.add(bullet);
  bullets.push({ mesh: bullet, dir });
});

// Рух з колізією
function movePlayer(dx, dz) {
  const newPos = player.position.clone();
  newPos.x += dx;
  newPos.z += dz;
  player.position.copy(newPos);

  const playerBox = new THREE.Box3().setFromObject(player);
  let collided = false;
  for (let building of buildings) {
    const buildingBox = new THREE.Box3().setFromObject(building);
    if (playerBox.intersectsBox(buildingBox)) {
      collided = true;
      break;
    }
  }
  if (collided) player.position.sub(new THREE.Vector3(dx, 0, dz));
}


// Анімація
function animate() {
  requestAnimationFrame(animate);
  const speed = 0.25;

  if (keys["w"]) movePlayer(Math.sin(yaw) * speed, Math.cos(yaw) * speed);
  if (keys["s"]) movePlayer(-Math.sin(yaw) * speed, -Math.cos(yaw) * speed);
  if (keys["a"]) movePlayer(Math.cos(yaw) * speed, -Math.sin(yaw) * speed);
  if (keys["d"]) movePlayer(-Math.cos(yaw) * speed, Math.sin(yaw) * speed);

  // Стрибок
  if (keys[" "] && isOnGround) {
    velocityY = 0.25;
    isOnGround = false;
  }
  if (!isOnGround) {
    player.position.y += velocityY;
    velocityY -= 0.01;
    if (player.position.y <= 2) {
      player.position.y = 2;
      velocityY = 0;
      isOnGround = true;
    }
  }

  // Обмеження карти
  const limit = 200;
  player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
  player.position.z = Math.max(-limit, Math.min(limit, player.position.z));

  // Камера позаду гравця
  const camOffset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * -5,
    Math.sin(pitch) * 5 + 2,
    Math.cos(yaw) * Math.cos(pitch) * -5,
  );
  camera.position.copy(player.position).add(camOffset);

  // дивимося не на таз, а на голову
  const headPos = player.position.clone();
  headPos.y += 2.5; // висота голови
  camera.lookAt(headPos);

  player.rotation.y = yaw;

  // Кулі + колізія
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

    // якщо куля вилетіла занадто далеко — видаляємо
    if (bulletObj.mesh.position.length() > 400) {
      scene.remove(bulletObj.mesh);
      bullets.splice(i, 1);
    }
  });

  // фінальний рендер
  renderer.render(scene, camera);
}
animate();
