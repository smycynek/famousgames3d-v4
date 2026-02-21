import * as THREE from 'three';
import { BOARD_SIZE, SQUARE_SIZE, MARGIN, SEAT_Y, BOARD_CENTER } from './sceneBuilder';
import { ANIMATION_DURATION } from './pieceUtils';

export function clearCrowns(
  scene: THREE.Scene,
  crownMeshes: THREE.Group[],
  crownTimeout: { current: ReturnType<typeof setTimeout> | null }
): void {
  if (crownTimeout.current) {
    clearTimeout(crownTimeout.current);
    crownTimeout.current = null;
  }
  crownMeshes.forEach((m) => scene.remove(m));
  crownMeshes.length = 0;
}

export function scheduleCrowns(
  scene: THREE.Scene,
  crownModel: THREE.Group,
  crownMeshes: THREE.Group[],
  crownTimeout: { current: ReturnType<typeof setTimeout> | null },
  disposables: THREE.Material[],
  result: string | undefined
): void {
  const chairOffset = (BOARD_SIZE - 1) * SQUARE_SIZE + SQUARE_SIZE / 2 + MARGIN + 2.5;
  const blackChairZ = -SQUARE_SIZE / 2 - MARGIN - 2.5;
  const crownY = SEAT_Y + 6.5;

  const placeCrown = (z: number, clipPlane?: THREE.Plane) => {
    const crown = crownModel.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.6,
      roughness: 0.2,
      side: clipPlane ? THREE.DoubleSide : THREE.FrontSide,
      clippingPlanes: clipPlane ? [clipPlane] : [],
    });
    disposables.push(mat);
    crown.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = mat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    crown.scale.multiplyScalar(1.875);
    crown.rotation.x = -Math.PI / 2;
    crown.rotation.z = Math.PI / 2;
    crown.position.set(BOARD_CENTER, crownY, z);
    scene.add(crown);
    crownMeshes.push(crown);
  };

  const crownDelay = ANIMATION_DURATION * 2.0 * 1000;
  crownTimeout.current = setTimeout(() => {
    crownTimeout.current = null;
    if (result === '1-0') {
      placeCrown(chairOffset);
    } else if (result === '0-1') {
      placeCrown(blackChairZ);
    } else if (result === '1/2-1/2') {
      const clipLeft = new THREE.Plane(new THREE.Vector3(0, 0, 1), -chairOffset);
      const clipRight = new THREE.Plane(new THREE.Vector3(0, 0, -1), blackChairZ);
      placeCrown(chairOffset, clipLeft);
      placeCrown(blackChairZ, clipRight);
    }
  }, crownDelay);
}
