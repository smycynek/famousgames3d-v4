import * as THREE from 'three';

// Colors
export const WHITE_PIECE_COLOR = 0xfff0d8; // Ivory tint
export const BLACK_PIECE_COLOR = 0x888080; // Darker tint with black
export const SCENE_BACKGROUND_COLOR = 0xf5f5dc; // Beige
export const SCENE_BACKGROUND_COLOR_2 = 0x8f7b6f; // Beige
export const LABEL_TEXT_COLOR = '#ffd700';

// Texture paths
const TEXTURE_BASE_PATH = import.meta.env.BASE_URL + 'textures/';

export const TEXTURE_PATHS = {
  lightWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_229M.jpg',
  darkWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_233M.jpg',
  redWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_187S.jpg',
  whiteGranite: TEXTURE_BASE_PATH + 'whiteGranite.jpg',
  blueGranite: TEXTURE_BASE_PATH + 'blueGranite.jpg',
} as const;

// Material properties
export const PIECE_MATERIAL_PROPS = {
  metalness: 0.3,
  roughness: 0.7,
};

// Loaded textures interface
export interface LoadedTextures {
  lightWood: THREE.Texture;
  darkWood: THREE.Texture;
  redWood: THREE.Texture;
  whiteGranite: THREE.Texture;
  blueGranite: THREE.Texture;
}

// Load all textures
export function loadTextures(): LoadedTextures {
  const loader = new THREE.TextureLoader();
  const lightWood = loader.load(TEXTURE_PATHS.lightWood);
  lightWood.wrapS = THREE.RepeatWrapping;
  lightWood.wrapT = THREE.RepeatWrapping;
  lightWood.repeat.set(1.6, 1.6);
  const darkWood = loader.load(TEXTURE_PATHS.darkWood);
  darkWood.wrapS = THREE.RepeatWrapping;
  darkWood.wrapT = THREE.RepeatWrapping;
  darkWood.repeat.set(2.0, 2.0);
  const redWood = loader.load(TEXTURE_PATHS.redWood);
  redWood.wrapS = THREE.RepeatWrapping;
  redWood.wrapT = THREE.RepeatWrapping;
  redWood.repeat.set(0.125, 0.125);
  return {
    lightWood,
    darkWood,
    redWood,
    whiteGranite: loader.load(TEXTURE_PATHS.whiteGranite),
    blueGranite: loader.load(TEXTURE_PATHS.blueGranite),
  };
}

// Create text texture for labels
export function createTextTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = LABEL_TEXT_COLOR;
  ctx.font = 'bold 96px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create piece material
export function createPieceMaterial(
  color: number,
  texture?: THREE.Texture
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    map: texture,
    ...PIECE_MATERIAL_PROPS,
  });
}

// Create board square materials
export function createSquareMaterials(textures: LoadedTextures): {
  light: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
} {
  return {
    light: new THREE.MeshStandardMaterial({
      map: textures.whiteGranite,
      color: 0xffffff,
      emissive: 0x444444,
      metalness: 0.05,
      roughness: 0.3,
    }),
    dark: new THREE.MeshStandardMaterial({
      map: textures.blueGranite,
      color: 0xccccee,
      metalness: 0.05,
      roughness: 0.3,
    }),
  };
}

// Create base material
export function createBaseMaterial(textures: LoadedTextures): THREE.MeshStandardMaterial {
  const rotatedTexture = textures.redWood.clone();
  rotatedTexture.center.set(0.5, 0.5);
  rotatedTexture.rotation = Math.PI / 4; // 45 degrees
  rotatedTexture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: rotatedTexture,
    color: 0xffbbaa,
    metalness: 0.05,
    roughness: 0.4,
  });
}

// Create label material
export function createLabelMaterial(texture: THREE.CanvasTexture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
}
