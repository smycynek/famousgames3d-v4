import * as THREE from 'three';
import {
  SQUARE_SIZE,
  TABLE_HEIGHT,
  BOARD_CENTER,
  TABLE_TOP_Y,
  type SceneBuilderParams,
} from './sceneBuilder';

export function buildPedestal(params: SceneBuilderParams): void {
  const { scene, textures, disposables, textureList } = params;

  const pedestalRadius = SQUARE_SIZE;
  const pedestalHeight = TABLE_HEIGHT * 10;
  const pedestalGeometry = new THREE.CylinderGeometry(
    pedestalRadius,
    pedestalRadius,
    pedestalHeight,
    32
  );
  const pedestalTexture = textures.stone.clone();
  pedestalTexture.wrapS = THREE.MirroredRepeatWrapping;
  pedestalTexture.wrapT = THREE.MirroredRepeatWrapping;
  pedestalTexture.repeat.set(1, 8);
  pedestalTexture.needsUpdate = true;
  textureList.push(pedestalTexture);
  const pedestalMaterial = new THREE.MeshStandardMaterial({
    map: pedestalTexture,
    color: 0xd8d0c8,
    metalness: 0.1,
    roughness: 0.5,
  });
  disposables.push(pedestalMaterial);
  const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
  pedestal.position.set(
    BOARD_CENTER,
    TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight / 2,
    BOARD_CENTER
  );
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
}
