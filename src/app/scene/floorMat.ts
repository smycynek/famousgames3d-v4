import * as THREE from 'three';
import {
  BOARD_SIZE,
  SQUARE_SIZE,
  MARGIN,
  TABLE_HEIGHT,
  BOARD_CENTER,
  TABLE_TOP_Y,
  type SceneBuilderParams,
} from './sceneBuilder';

export function buildFloorMat(params: SceneBuilderParams): THREE.CircleGeometry {
  const { scene, disposables, textureList } = params;

  const baseWidth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
  const tableWidth = baseWidth * 2.0;

  // Circular mat under the table — diameter 1.5 × table width, salmon tint with speckles
  const pedestalHeight = TABLE_HEIGHT * 10;
  const matFloorY = TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight + 0.02;
  const matRadius = tableWidth * 1.5;

  const matCanvas = document.createElement('canvas');
  matCanvas.width = 256;
  matCanvas.height = 256;
  const matCtx = matCanvas.getContext('2d')!;
  const matImageData = matCtx.createImageData(256, 256);
  const md = matImageData.data;
  for (let i = 0; i < md.length; i += 4) {
    const r = Math.random();
    if (r < 0.04) {
      // Black fleck
      const v = Math.floor(Math.random() * 40);
      md[i] = v;
      md[i + 1] = v;
      md[i + 2] = v;
    } else if (r < 0.1) {
      // Grey fleck
      const v = Math.floor(120 + Math.random() * 80);
      md[i] = v;
      md[i + 1] = v;
      md[i + 2] = v;
    } else {
      // Desaturated salmon base with grain
      const speckle = (Math.random() - 0.5) * 30;
      md[i] = Math.min(255, Math.max(0, 232 + speckle));
      md[i + 1] = Math.min(255, Math.max(0, 165 + speckle * 0.6));
      md[i + 2] = Math.min(255, Math.max(0, 155 + speckle * 0.4));
    }
    md[i + 3] = 255;
  }
  matCtx.putImageData(matImageData, 0, 0);
  const matTex = new THREE.CanvasTexture(matCanvas);
  matTex.wrapS = THREE.RepeatWrapping;
  matTex.wrapT = THREE.RepeatWrapping;
  matTex.repeat.set(6, 6);
  matTex.needsUpdate = true;
  textureList.push(matTex);

  const matMaterial = new THREE.MeshStandardMaterial({
    map: matTex,
    color: 0xe5a69a,
    metalness: 0.05,
    roughness: 0.8,
  });
  disposables.push(matMaterial);
  const matGeometry = new THREE.CircleGeometry(matRadius, 64);
  const matMesh = new THREE.Mesh(matGeometry, matMaterial);
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.position.set(BOARD_CENTER, matFloorY, BOARD_CENTER);
  matMesh.receiveShadow = true;
  scene.add(matMesh);
  return matGeometry;
}
