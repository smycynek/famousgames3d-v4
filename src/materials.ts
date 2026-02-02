import * as THREE from 'three';

// Colors
export const WHITE_PIECE_COLOR = 0xcccccc; // Light grey
export const BLACK_PIECE_COLOR = 0x8f7b6f; // Brown (lighter)
export const SCENE_BACKGROUND_COLOR = 0xf5f5dc; // Beige
export const SCENE_BACKGROUND_COLOR_2 = 0x8f7b6f; // Beige
export const LABEL_TEXT_COLOR = '#ffd700';

// Texture paths
const TEXTURE_BASE_PATH = import.meta.env.BASE_URL + 'textures/';

export const TEXTURE_PATHS = {
  whiteMarble: TEXTURE_BASE_PATH + 'whiteMarble.jpg',
  brownMarble: TEXTURE_BASE_PATH + 'brownMarble.jpg',
  redWood: TEXTURE_BASE_PATH + 'redWood.jpg',
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
  whiteMarble: THREE.Texture;
  brownMarble: THREE.Texture;
  redWood: THREE.Texture;
  whiteGranite: THREE.Texture;
  blueGranite: THREE.Texture;
}

// Load all textures
export function loadTextures(): LoadedTextures {
  const loader = new THREE.TextureLoader();
  return {
    whiteMarble: loader.load(TEXTURE_PATHS.whiteMarble),
    brownMarble: loader.load(TEXTURE_PATHS.brownMarble),
    redWood: loader.load(TEXTURE_PATHS.redWood),
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
  return new THREE.MeshStandardMaterial({
    map: textures.redWood,
    color: 0xffcccc,
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
