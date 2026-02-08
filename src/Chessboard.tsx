import { onMount, onCleanup, createSignal, createEffect } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Chess, type Square } from 'chess.js';
import gsap from 'gsap';
import type { ParsedGame } from './assets/games';
import { buildLights } from './lighting';
import {
  WHITE_PIECE_COLOR,
  BLACK_PIECE_COLOR,
  loadTextures,
  createTextTexture,
  createSquareMaterials,
  createBaseMaterial,
  createLabelMaterial,
  type LoadedTextures,
  SCENE_BACKGROUND_COLOR,
  SCENE_BACKGROUND_COLOR_2,
} from './materials';

const BOARD_SIZE = 8;
const SQUARE_SIZE = 1;
const SQUARE_HEIGHT = 0.1;
const BASE_HEIGHT = 0.4;
const MARGIN = 0.6;
const BEVEL_SIZE = 0.35;
const TABLE_HEIGHT = BASE_HEIGHT * 5;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const PIECE_TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'] as const;
const PIECE_BASE_SIZE = SQUARE_SIZE * 0.6 * 2 * 0.8; // 60% of square width, scaled
const ANIMATION_DURATION = 1.0; // seconds
const KNIGHT_HOP_HEIGHT = 1.5; // how high knights jump
type PieceType = (typeof PIECE_TYPES)[number];
type PieceModels = Record<PieceType, THREE.Group>;

// Map chess.js piece types to our piece types
const PIECE_TYPE_MAP: Record<string, PieceType> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
};

// Create gradient background texture
function createGradientBackground(topColor: number, bottomColor: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const topColorStr = '#' + topColor.toString(16).padStart(6, '0');
  const bottomColorStr = '#' + bottomColor.toString(16).padStart(6, '0');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, topColorStr);
  gradient.addColorStop(1, bottomColorStr);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface ChessboardProps {
  game?: ParsedGame | null;
  moveIndex?: number;
}

function scalePieceToFit(model: THREE.Group, targetBaseSize: number): void {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Use the larger of X or Z as the base diameter
  const currentBaseSize = Math.max(size.x, size.z);
  const scale = targetBaseSize / currentBaseSize;

  model.scale.set(scale, scale, scale);
}

function createPieceInstance(
  model: THREE.Group,
  color: number,
  disposables: THREE.Material[],
  scale: number = 1,
  texture?: THREE.Texture
): THREE.Group {
  const clone = model.clone();
  const material = new THREE.MeshStandardMaterial({
    color,
    map: texture,
    metalness: 0.05,
    roughness: 0.25,
    transparent: false,
    opacity: 1,
  });
  disposables.push(material);

  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = material;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  if (scale !== 1) {
    clone.scale.multiplyScalar(scale);
  }

  return clone;
}

function placePiece(
  piece: THREE.Group,
  col: number,
  row: number,
  scene: THREE.Scene,
  isBlack: boolean
): void {
  // Position piece at center of square, on top of the board
  piece.position.set(col * SQUARE_SIZE, SQUARE_HEIGHT / 2, row * SQUARE_SIZE);

  // Rotate all pieces 90 degrees on Z axis and X axis
  piece.rotation.z = Math.PI / 2;
  piece.rotation.x = isBlack ? Math.PI / 2 : Math.PI / 2 + Math.PI;

  // Rotate black pieces to face the other direction
  if (isBlack) {
    piece.rotation.y = Math.PI;
  }

  scene.add(piece);
}

// Helper to convert col/row to square name (e.g., 0,7 -> "a1")
function toSquareName(col: number, row: number): string {
  const file = String.fromCharCode(97 + col); // 'a' to 'h'
  const rank = 8 - row; // row 0 = rank 8, row 7 = rank 1
  return `${file}${rank}`;
}

// Helper to convert square name to col/row
function fromSquareName(square: string): { col: number; row: number } {
  const col = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]);
  const row = 8 - rank;
  return { col, row };
}

interface PieceInfo {
  mesh: THREE.Group;
  type: PieceType;
  isBlack: boolean;
}

function Chessboard(props: ChessboardProps) {
  let containerRef: HTMLDivElement | undefined;
  let renderer: THREE.WebGLRenderer | undefined;
  let animationId: number | undefined;
  let loadedTextures: LoadedTextures | undefined;
  // Track pieces by square name (e.g., "e4")
  const piecesBySquare = new Map<string, PieceInfo>();
  let lastMoveIndex = -2; // Track last processed move index
  let currentChess: Chess | null = null;
  const disposables: THREE.Material[] = [];
  const textureList: THREE.Texture[] = [];
  const [pieceModels, setPieceModels] = createSignal<PieceModels | null>(null);

  onMount(() => {
    if (!containerRef) return;

    // Scene setup
    const scene = new THREE.Scene();

    // Load all textures
    loadedTextures = loadTextures();
    Object.values(loadedTextures).forEach((t) => textureList.push(t));

    // Scale factors for different piece types
    const getScale = (pieceType: PieceType): number => {
      if (pieceType === 'queen') {
        return 1.4641 * 1.07 * 1.05 * 1.05;
      }
      if (pieceType === 'king') {
        return 1.4641 * 1.07 * 1.02 * 1.03 * 1.05 * 1.05;
      }
      if (pieceType === 'bishop') {
        return 1.4641 * 1.07 * 0.9 * 1.05 * 1.05;
      }
      if (pieceType === 'knight') {
        return 1.07 * 1.05 * 1.05;
      }
      if (pieceType === 'pawn') {
        return 0.825 * 1.1 * 1.03 * 1.03;
      }
      return 1.05 * 1.05; // rook
    };

    // Track captured pieces
    const capturedWhitePieces: THREE.Group[] = [];
    const capturedBlackPieces: THREE.Group[] = [];

    // Clear all pieces from the board
    const clearAllPieces = () => {
      piecesBySquare.forEach((info) => {
        scene.remove(info.mesh);
      });
      piecesBySquare.clear();
      capturedWhitePieces.forEach((mesh) => scene.remove(mesh));
      capturedBlackPieces.forEach((mesh) => scene.remove(mesh));
      capturedWhitePieces.length = 0;
      capturedBlackPieces.length = 0;
    };

    // Create and place a single piece on the board
    const createPiece = (
      pm: PieceModels,
      pieceType: PieceType,
      col: number,
      row: number,
      isBlack: boolean
    ): PieceInfo => {
      const texture = isBlack ? loadedTextures?.darkWood : loadedTextures?.lightWood;
      const color = isBlack ? BLACK_PIECE_COLOR : WHITE_PIECE_COLOR;
      const piece = createPieceInstance(
        pm[pieceType],
        color,
        disposables,
        getScale(pieceType),
        texture
      );
      placePiece(piece, col, row, scene, isBlack);
      // Rotate knights on Z axis
      if (pieceType === 'knight') {
        piece.rotation.z += isBlack ? Math.PI / 4 + Math.PI : -Math.PI / 4;
      }
      return { mesh: piece, type: pieceType, isBlack };
    };

    // Animate a piece moving from one position to another
    const animatePieceMove = (
      piece: THREE.Group,
      _fromCol: number,
      _fromRow: number,
      toCol: number,
      toRow: number,
      isKnight: boolean
    ) => {
      const endX = toCol * SQUARE_SIZE;
      const endZ = toRow * SQUARE_SIZE;
      const baseY = SQUARE_HEIGHT / 2;

      if (isKnight) {
        // Knight hops in an arc
        gsap.to(piece.position, {
          duration: ANIMATION_DURATION,
          x: endX,
          z: endZ,
          ease: 'power2.inOut',
        });
        // Separate Y animation for the hop
        gsap.to(piece.position, {
          duration: ANIMATION_DURATION / 2,
          y: baseY + KNIGHT_HOP_HEIGHT,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(piece.position, {
              duration: ANIMATION_DURATION / 2,
              y: baseY,
              ease: 'power2.in',
            });
          },
        });
      } else {
        // Regular pieces slide linearly
        gsap.to(piece.position, {
          duration: ANIMATION_DURATION,
          x: endX,
          z: endZ,
          ease: 'power2.inOut',
        });
      }
    };

    // Remove a piece with optional animation and delay - moves captured pieces to the side
    const removePiece = (squareName: string, animate: boolean = false, delay: number = 0) => {
      const info = piecesBySquare.get(squareName);
      if (info) {
        if (animate) {
          // Determine which side to place the captured piece
          const capturedList = info.isBlack ? capturedBlackPieces : capturedWhitePieces;
          const captureIndex = capturedList.length;
          capturedList.push(info.mesh);

          // Calculate target position on the side of the board
          // White pieces (captured by black) go on the right, black pieces go on the left
          const sideX = info.isBlack
            ? -SQUARE_SIZE * 2.5 // Left side for captured black pieces
            : BOARD_SIZE * SQUARE_SIZE + SQUARE_SIZE * 1.5; // Right side for captured white pieces
          const row = captureIndex % 8; // Wrap around after 8 pieces
          const col = Math.floor(captureIndex / 8) * 1.0; // Stack in columns if more than 8
          const targetX = sideX - (info.isBlack ? col : -col);
          // Black pieces line up starting near rank 1 (white's side), white pieces near rank 8 (black's side)
          const targetZ = info.isBlack ? (BOARD_SIZE - 1 - row) * SQUARE_SIZE : row * SQUARE_SIZE;
          const targetY = -SQUARE_HEIGHT / 2 - BASE_HEIGHT - BEVEL_SIZE * 2 + BEVEL_SIZE; // Rest on the table

          // Animate captured piece: raise up quickly and high to avoid collision, move to side, then lower
          gsap.to(info.mesh.position, {
            duration: ANIMATION_DURATION * 0.2,
            delay: delay,
            y: info.mesh.position.y + SQUARE_SIZE * 3,
            ease: 'power2.out',
          });
          gsap.to(info.mesh.position, {
            duration: ANIMATION_DURATION * 0.5,
            delay: delay + ANIMATION_DURATION * 0.2,
            x: targetX,
            z: targetZ,
            ease: 'power2.inOut',
          });
          gsap.to(info.mesh.position, {
            duration: ANIMATION_DURATION * 0.3,
            delay: delay + ANIMATION_DURATION * 0.7,
            y: targetY,
            ease: 'power2.in',
          });
        } else {
          scene.remove(info.mesh);
        }
        piecesBySquare.delete(squareName);
      }
    };

    // Set up the board from a chess position (no animation - used for initial setup)
    const setupBoardFromChess = (chess: Chess, pm: PieceModels) => {
      clearAllPieces();
      const board = chess.board();
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const square = board[rank][file];
          if (square) {
            const pieceType = PIECE_TYPE_MAP[square.type];
            const isBlack = square.color === 'b';
            const col = file;
            const row = rank;
            const squareName = toSquareName(col, row);
            const pieceInfo = createPiece(pm, pieceType, col, row, isBlack);
            piecesBySquare.set(squareName, pieceInfo);
          }
        }
      }
      currentChess = chess;
    };

    // Apply a single move with animation
    const applyMoveAnimated = (chess: Chess, pm: PieceModels, moveNotation: string) => {
      // Get the move details before making it
      const move = chess.move(moveNotation);
      if (!move) return;

      const fromSquare = move.from as Square;
      const toSquare = move.to as Square;
      const { col: fromCol, row: fromRow } = fromSquareName(fromSquare);
      const { col: toCol, row: toRow } = fromSquareName(toSquare);
      const isKnight = move.piece === 'n';

      // Handle capture - remove the captured piece immediately so it clears the square
      if (move.captured) {
        const captureDelay = 0;
        // For en passant, the captured pawn is on a different square
        if (move.flags.includes('e')) {
          const capturedSquare = `${toSquare[0]}${fromSquare[1]}`;
          removePiece(capturedSquare, true, captureDelay);
        } else {
          removePiece(toSquare, true, captureDelay);
        }
      }

      // Move the piece
      const pieceInfo = piecesBySquare.get(fromSquare);
      if (pieceInfo) {
        piecesBySquare.delete(fromSquare);
        piecesBySquare.set(toSquare, pieceInfo);
        animatePieceMove(pieceInfo.mesh, fromCol, fromRow, toCol, toRow, isKnight);
      }

      // Handle castling - also move the rook
      if (move.flags.includes('k') || move.flags.includes('q')) {
        const isKingside = move.flags.includes('k');
        const rookFromFile = isKingside ? 7 : 0;
        const rookToFile = isKingside ? 5 : 3;
        const rookRank = move.color === 'w' ? 7 : 0;
        const rookFromSquare = toSquareName(rookFromFile, rookRank);
        const rookToSquare = toSquareName(rookToFile, rookRank);

        const rookInfo = piecesBySquare.get(rookFromSquare);
        if (rookInfo) {
          piecesBySquare.delete(rookFromSquare);
          piecesBySquare.set(rookToSquare, rookInfo);
          animatePieceMove(rookInfo.mesh, rookFromFile, rookRank, rookToFile, rookRank, false);
        }
      }

      // Handle promotion
      if (move.promotion) {
        const promotedType = PIECE_TYPE_MAP[move.promotion];
        const isBlack = move.color === 'b';
        // Remove the pawn and create the promoted piece
        setTimeout(() => {
          removePiece(toSquare, false);
          const newPieceInfo = createPiece(pm, promotedType, toCol, toRow, isBlack);
          piecesBySquare.set(toSquare, newPieceInfo);

          // Brief brightness boost for promoted piece
          const materials: THREE.MeshStandardMaterial[] = [];
          newPieceInfo.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              const mat = child.material as THREE.MeshStandardMaterial;
              mat.emissive = new THREE.Color(0xffffff);
              mat.emissiveIntensity = 0.5;
              materials.push(mat);
            }
          });
          const brightnessProxy = { value: 0.5 };
          gsap.to(brightnessProxy, {
            duration: 0.5,
            value: 0,
            ease: 'power2.out',
            onUpdate: () => {
              materials.forEach((mat) => {
                mat.emissiveIntensity = brightnessProxy.value;
              });
            },
          });
        }, ANIMATION_DURATION * 1000);
      }

      currentChess = chess;
    };

    // Undo a move (rebuild from scratch for simplicity)
    const rebuildBoard = (chess: Chess, pm: PieceModels) => {
      setupBoardFromChess(chess, pm);
    };

    // Load chess piece models
    const loader = new GLTFLoader();
    const basePath = import.meta.env.BASE_URL + 'pieces/';

    const loadPieces = async () => {
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

      setPieceModels(models as PieceModels);
      console.log('All chess pieces loaded');

      // Set up the starting position
      const chess = new Chess();
      setupBoardFromChess(chess, models as PieceModels);
      lastMoveIndex = -1;
    };

    // Watch for game/moveIndex changes and update board
    createEffect(() => {
      const pm = pieceModels();
      const game = props.game;
      const moveIndex = props.moveIndex ?? -1;

      if (!pm) return;

      // If no game selected, show starting position
      if (!game) {
        if (lastMoveIndex !== -1) {
          const chess = new Chess();
          setupBoardFromChess(chess, pm);
          lastMoveIndex = -1;
        }
        return;
      }

      // Get the moves from the parsed game
      const parsedGame = game.parsed[0];
      if (!parsedGame?.moves) return;

      const moves = parsedGame.moves;

      // Determine if we're moving forward or backward
      if (moveIndex === lastMoveIndex) {
        return; // No change
      }

      if (moveIndex > lastMoveIndex && moveIndex - lastMoveIndex === 1) {
        // Moving forward by one - animate the move
        const move = moves[moveIndex];
        if (move?.notation?.notation && currentChess) {
          const chessCopy = new Chess(currentChess.fen());
          applyMoveAnimated(chessCopy, pm, move.notation.notation);
        }
      } else {
        // Moving backward or jumping multiple moves - rebuild the board
        const chess = new Chess();
        for (let i = 0; i <= moveIndex && i < moves.length; i++) {
          const move = moves[i];
          if (move.notation?.notation) {
            try {
              chess.move(move.notation.notation);
            } catch (e) {
              console.error(`Invalid move: ${move.notation.notation}`, e);
              break;
            }
          }
        }
        rebuildBoard(chess, pm);
      }

      lastMoveIndex = moveIndex;
    });

    loadPieces();
    const gradientBackground = createGradientBackground(
      SCENE_BACKGROUND_COLOR,
      SCENE_BACKGROUND_COLOR_2
    );
    scene.background = gradientBackground;
    textureList.push(gradientBackground);

    // Camera setup
    const isMobile = containerRef.clientWidth < 768;
    const isPortrait = containerRef.clientHeight > containerRef.clientWidth;
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.clientWidth / containerRef.clientHeight,
      0.1,
      1000
    );
    const mobileZ = isMobile && isPortrait ? 18 : 10;
    camera.position.set(3.5, isMobile ? 7 : 4, isMobile ? mobileZ : 12);
    camera.lookAt(3.5, 0, 3.5);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.clientWidth, containerRef.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.appendChild(renderer.domElement);

    // Orbit controls for pan, zoom, and orbit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(3.5, 0, 3.5);
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.update();

    // Lighting

    const lights = buildLights();
    lights.forEach((light) => scene.add(light));

    // Create base with beveled edges
    const baseWidth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
    const baseDepth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
    const baseShape = new THREE.Shape();
    baseShape.moveTo(-baseWidth / 2, -baseDepth / 2);
    baseShape.lineTo(baseWidth / 2, -baseDepth / 2);
    baseShape.lineTo(baseWidth / 2, baseDepth / 2);
    baseShape.lineTo(-baseWidth / 2, baseDepth / 2);
    baseShape.lineTo(-baseWidth / 2, -baseDepth / 2);
    const extrudeSettings = {
      depth: BASE_HEIGHT,
      bevelEnabled: true,
      bevelThickness: BEVEL_SIZE,
      bevelSize: BEVEL_SIZE,
      bevelSegments: 2,
    };
    const baseGeometry = new THREE.ExtrudeGeometry(baseShape, extrudeSettings);
    baseGeometry.rotateX(-Math.PI / 2);
    const baseMaterial = createBaseMaterial(loadedTextures!);
    disposables.push(baseMaterial);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(
      (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2,
      -SQUARE_HEIGHT / 2 - BASE_HEIGHT - BEVEL_SIZE,
      (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2
    );
    base.receiveShadow = true;
    scene.add(base);

    // Create table under the base with beveled edges
    const tableWidth = baseWidth * 1.65;
    const tableDepth = baseDepth * 1.265;
    const tableShape = new THREE.Shape();
    tableShape.moveTo(-tableWidth / 2, -tableDepth / 2);
    tableShape.lineTo(tableWidth / 2, -tableDepth / 2);
    tableShape.lineTo(tableWidth / 2, tableDepth / 2);
    tableShape.lineTo(-tableWidth / 2, tableDepth / 2);
    tableShape.lineTo(-tableWidth / 2, -tableDepth / 2);
    const tableExtrudeSettings = {
      depth: TABLE_HEIGHT,
      bevelEnabled: true,
      bevelThickness: BEVEL_SIZE,
      BEVEL_SIZE: BEVEL_SIZE,
      bevelSegments: 2,
    };
    const tableGeometry = new THREE.ExtrudeGeometry(tableShape, tableExtrudeSettings);
    tableGeometry.rotateX(-Math.PI / 2);
    const tableMaterial = new THREE.MeshStandardMaterial({
      map: loadedTextures!.stone,
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.5,
    });
    disposables.push(tableMaterial);
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(
      (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2,
      -SQUARE_HEIGHT / 2 - BASE_HEIGHT - BEVEL_SIZE * 2 - TABLE_HEIGHT,
      (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2
    );
    table.receiveShadow = true;
    table.castShadow = true;
    scene.add(table);

    // Create chessboard squares
    const squareMaterials = createSquareMaterials(loadedTextures!);
    disposables.push(squareMaterials.light, squareMaterials.dark);
    const squareGeometry = new THREE.BoxGeometry(SQUARE_SIZE, SQUARE_HEIGHT, SQUARE_SIZE);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const isLight = (row + col) % 2 === 0;
        let material;
        if (isLight) {
          // Create unique material with randomly rotated texture for each light square
          const rotatedTexture = loadedTextures!.whiteGranite.clone();
          rotatedTexture.center.set(0.5, 0.5);
          rotatedTexture.rotation = Math.random() * Math.PI * 2;
          rotatedTexture.needsUpdate = true;
          material = new THREE.MeshStandardMaterial({
            map: rotatedTexture,
            color: 0xffffff,
            emissive: 0x444444,
            metalness: 0.05,
            roughness: 0.3,
          });
          disposables.push(material);
        } else {
          // Create unique material with randomly rotated texture for each dark square
          const rotatedTexture = loadedTextures!.blueGranite.clone();
          rotatedTexture.center.set(0.5, 0.5);
          rotatedTexture.rotation = Math.random() * Math.PI * 2;
          rotatedTexture.needsUpdate = true;
          material = new THREE.MeshStandardMaterial({
            map: rotatedTexture,
            color: 0xccccee,
            metalness: 0.05,
            roughness: 0.3,
          });
          disposables.push(material);
        }
        const square = new THREE.Mesh(squareGeometry, material);

        square.position.set(col * SQUARE_SIZE, 0, row * SQUARE_SIZE);
        square.receiveShadow = true;
        scene.add(square);
      }
    }

    // Create file labels (a-h) along bottom edge (white's side)
    const labelGeometry = new THREE.PlaneGeometry(0.5, 0.5);
    FILES.forEach((file, i) => {
      const texture = createTextTexture(file);
      textureList.push(texture);
      const material = createLabelMaterial(texture);
      disposables.push(material);
      const label = new THREE.Mesh(labelGeometry, material);
      label.rotation.x = -Math.PI / 2;
      label.position.set(
        i * SQUARE_SIZE,
        -SQUARE_HEIGHT / 2 + 0.001,
        BOARD_SIZE * SQUARE_SIZE - SQUARE_SIZE / 2 + MARGIN / 2
      );
      scene.add(label);
    });

    // Create file labels (a-h) along top edge (black's side)
    FILES.forEach((file, i) => {
      const texture = createTextTexture(file);
      textureList.push(texture);
      const material = createLabelMaterial(texture);
      disposables.push(material);
      const label = new THREE.Mesh(labelGeometry, material);
      label.rotation.x = -Math.PI / 2;
      label.rotation.z = Math.PI;
      label.position.set(
        i * SQUARE_SIZE,
        -SQUARE_HEIGHT / 2 + 0.001,
        -SQUARE_SIZE / 2 - MARGIN / 2
      );
      scene.add(label);
    });

    // Create rank labels (1-8) along left edge (white's side)
    RANKS.forEach((rank, i) => {
      const texture = createTextTexture(rank);
      textureList.push(texture);
      const material = createLabelMaterial(texture);
      disposables.push(material);
      const label = new THREE.Mesh(labelGeometry, material);
      label.rotation.x = -Math.PI / 2;
      label.position.set(
        -SQUARE_SIZE / 2 - MARGIN / 2,
        -SQUARE_HEIGHT / 2 + 0.001,
        (BOARD_SIZE - 1 - i) * SQUARE_SIZE
      );
      scene.add(label);
    });

    // Create rank labels (1-8) along right edge (black's side)
    RANKS.forEach((rank, i) => {
      const texture = createTextTexture(rank);
      textureList.push(texture);
      const material = createLabelMaterial(texture);
      disposables.push(material);
      const label = new THREE.Mesh(labelGeometry, material);
      label.rotation.x = -Math.PI / 2;
      label.rotation.z = Math.PI;
      label.position.set(
        BOARD_SIZE * SQUARE_SIZE - SQUARE_SIZE / 2 + MARGIN / 2,
        -SQUARE_HEIGHT / 2 + 0.001,
        (BOARD_SIZE - 1 - i) * SQUARE_SIZE
      );
      scene.add(label);
    });

    // Handle window resize
    const handleResize = () => {
      if (!containerRef || !renderer) return;
      camera.aspect = containerRef.clientWidth / containerRef.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.clientWidth, containerRef.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer?.render(scene, camera);
    };
    animate();

    // Cleanup
    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
      controls.dispose();
      renderer?.dispose();
      squareGeometry.dispose();
      baseGeometry.dispose();
      labelGeometry.dispose();
      disposables.forEach((m) => m.dispose());
      textureList.forEach((t) => t.dispose());
    });
  });

  return <div border-style="solid" ref={containerRef} class="chessboard-container" />;
}

export default Chessboard;
