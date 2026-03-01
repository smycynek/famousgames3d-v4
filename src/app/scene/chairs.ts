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
import { BLACK_CHAIR_TINT, createChairMaterial, WHITE_CHAIR_TINT } from '../materials';

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
  const { scene, loadedTextures } = params;
  const floorY = TABLE_TOP_Y - TABLE_HEIGHT - TABLE_HEIGHT * 10;
  const targetWidth = (BOARD_SIZE * SQUARE_SIZE + MARGIN * 2) * 2.0 * 0.5 * 2 * 0.585;
  const createChair = (z: number, material: THREE.MeshStandardMaterial, rotateY: number) => {
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

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    clone.rotation.y = rotateY;
    clone.position.set(BOARD_CENTER, floorY - scaledBox.min.y, z);
    scene.add(clone);
  };

  const whiteChairMaterial = createChairMaterial(WHITE_CHAIR_TINT, loadedTextures.whiteGranite);
  const blackChairMaterial = createChairMaterial(BLACK_CHAIR_TINT, loadedTextures.whiteGranite);
  createChair(WHITE_CHAIR_Z, whiteChairMaterial, 0);
  createChair(BLACK_CHAIR_Z, blackChairMaterial, Math.PI);
}
