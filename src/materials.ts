import * as THREE from 'three';

// Colors
export const WHITE_PIECE_COLOR = 0xfff0d8; // Ivory tint
export const BLACK_PIECE_COLOR = 0x888080; // Darker tint with black
export const SCENE_BACKGROUND_COLOR = 0x000005; // Near black
export const SCENE_BACKGROUND_COLOR_2 = 0x8f7b6f; // Beige
export const LABEL_TEXT_COLOR = '#aa7700';

// Texture paths
const TEXTURE_BASE_PATH = import.meta.env.BASE_URL + 'textures/';

export const TEXTURE_PATHS = {
  lightWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_229M.jpg',
  darkWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_233M.jpg',
  redWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_187M.jpg',
  whiteGranite: TEXTURE_BASE_PATH + 'whiteGranite.jpg',
  blueGranite: TEXTURE_BASE_PATH + 'blueGranite.jpg',
  stone: TEXTURE_BASE_PATH + 'Texturelabs_Stone_134M.jpg',
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
  stone: THREE.Texture;
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
    whiteGranite: (() => {
      const tex = loader.load(TEXTURE_PATHS.whiteGranite);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(0.5, 0.5);
      return tex;
    })(),
    blueGranite: (() => {
      const tex = loader.load(TEXTURE_PATHS.blueGranite);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(0.25, 0.25);
      return tex;
    })(),
    stone: (() => {
      const tex = loader.load(TEXTURE_PATHS.stone);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(0.1, 0.1);
      return tex;
    })(),
  };
}

// Create text texture for labels with speckled gold effect
export function createTextTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text with base gold color
  ctx.fillStyle = LABEL_TEXT_COLOR;
  ctx.font = 'bold 96px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  // Add speckled gold effect
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Only modify non-transparent pixels (the text)
    if (data[i + 3] > 0) {
      const speckle = Math.random() * 160 - 80; // Random variation -80 to +80
      data[i] = Math.min(255, Math.max(0, data[i] + speckle)); // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + speckle * 0.7)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + speckle * 0.3)); // B
    }
  }
  ctx.putImageData(imageData, 0, 0);

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
