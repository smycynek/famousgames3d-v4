import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PIECE_TYPES, PIECE_BASE_SIZE, type PieceModels, scalePieceToFit } from '../pieceUtils';

export async function loadPieceModels(
  loader: GLTFLoader,
  basePath: string
): Promise<Partial<PieceModels>> {
  const models: Partial<PieceModels> = {};

  for (const pieceType of PIECE_TYPES) {
    try {
      const gltf = await loader.loadAsync(`${basePath}${pieceType}.glb`);
      const model = gltf.scene;
      scalePieceToFit(model, PIECE_BASE_SIZE);
      models[pieceType] = model;
      console.log(`Loaded and scaled ${pieceType} model`);
    } catch (error) {
      console.error(`Failed to load ${pieceType}:`, error);
    }
  }

  return models;
}
