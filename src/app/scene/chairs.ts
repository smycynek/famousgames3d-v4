import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  BOARD_SIZE,
  SQUARE_SIZE,
  MARGIN,
  TABLE_HEIGHT,
  BOARD_CENTER,
  TABLE_TOP_Y,
  WHITE_CHAIR_Z,
  BLACK_CHAIR_Z,
  type SceneBuilderParams,
} from './sceneBuilder';

export async function loadChairModel(loader: GLTFLoader, basePath: string): Promise<GLTF | null> {
  try {
    const chairGltf = await loader.loadAsync(`${basePath}chair.gltf`);
    console.log('Loaded chair gltf');
    return chairGltf;
  } catch (error) {
    console.error('Failed to load gltf:', error);
    return null;
  }
}

export function buildChairs(params: SceneBuilderParams, chairModel: THREE.Group): void {
  const { scene, textures, disposables, textureList } = params;

  const floorY = TABLE_TOP_Y - TABLE_HEIGHT - TABLE_HEIGHT * 10;
  const targetWidth = (BOARD_SIZE * SQUARE_SIZE + MARGIN * 2) * 2.0 * 0.5 * 2 * 0.585;

  const createChair = (
    color: number,
    z: number,
    texture: THREE.Texture | undefined,
    rotateY: number
  ) => {
    const clone = chairModel.clone();

    // Scale to target width
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const currentWidth = Math.max(size.x, size.z);
    const scale = targetWidth / currentWidth;
    clone.scale.set(scale, scale, scale);

    // Compute bottom of scaled model for correct Y floor placement
    const scaledBox = new THREE.Box3().setFromObject(clone);

    const mat = new THREE.MeshStandardMaterial({
      color,
      map: texture,
      metalness: 0.05,
      roughness: 0.4,
    });
    disposables.push(mat);

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = mat;
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    clone.rotation.y = rotateY;
    clone.position.set(BOARD_CENTER, floorY - scaledBox.min.y, z);
    scene.add(clone);
  };

  // White chair on white's side (high z)
  const whiteChairTex = textures.whiteGranite.clone();
  whiteChairTex.repeat.set(
    textures.whiteGranite.repeat.x * 0.125,
    textures.whiteGranite.repeat.y * 0.125
  );
  whiteChairTex.center.set(0.5, 0.5);
  whiteChairTex.rotation = Math.PI / 4;
  whiteChairTex.needsUpdate = true;
  textureList.push(whiteChairTex);

  // Black chair on black's side (low z, facing opposite direction)
  const blackChairTex = textures.whiteGranite.clone();
  blackChairTex.repeat.set(
    textures.whiteGranite.repeat.x * 0.125,
    textures.whiteGranite.repeat.y * 0.125
  );
  blackChairTex.center.set(0.5, 0.5);
  blackChairTex.rotation = Math.PI / 4;
  blackChairTex.needsUpdate = true;
  textureList.push(blackChairTex);

  createChair(0xf5f5f5, WHITE_CHAIR_Z, whiteChairTex, 0);
  createChair(0x625a52, BLACK_CHAIR_Z, blackChairTex, Math.PI);
}
