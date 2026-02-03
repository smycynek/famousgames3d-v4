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
} from './materials';

const BOARD_SIZE = 8;
const SQUARE_SIZE = 1;
const SQUARE_HEIGHT = 0.1;
const BASE_HEIGHT = 0.2;
const MARGIN = 0.6;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const PIECE_TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'] as const;
const PIECE_BASE_SIZE = SQUARE_SIZE * 0.6 * 2 * 0.8; // 60% of square width, scaled
const ANIMATION_DURATION = 0.5; // seconds
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
    metalness: 0.1,
    roughness: 0.1,
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
        return 1.4641 * 1.07;
      }
      if (pieceType === 'king') {
        return 1.4641 * 1.07 * 1.02 * 1.03;
      }
      if (pieceType === 'bishop') {
        return 1.4641 * 1.07 * 0.9;
      }
      if (pieceType === 'knight') {
        return 1.07;
      }
      if (pieceType === 'pawn') {
        return 0.825 * 1.1;
      }
      return 1;
    };

    // Clear all pieces from the board
    const clearAllPieces = () => {
      piecesBySquare.forEach((info) => {
        scene.remove(info.mesh);
      });
      piecesBySquare.clear();
    };

    // Create and place a single piece on the board
    const createPiece = (
      pm: PieceModels,
      pieceType: PieceType,
      col: number,
      row: number,
      isBlack: boolean
    ): PieceInfo => {
      const texture = isBlack ? loadedTextures?.brownMarble : loadedTextures?.whiteMarble;
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

    // Remove a piece with optional animation
    const removePiece = (squareName: string, animate: boolean = false) => {
      const info = piecesBySquare.get(squareName);
      if (info) {
        if (animate) {
          // Fade out captured piece
          gsap.to(info.mesh.scale, {
            duration: ANIMATION_DURATION * 0.5,
            x: 0,
            y: 0,
            z: 0,
            ease: 'power2.in',
            onComplete: () => {
              scene.remove(info.mesh);
            },
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

      // Handle capture - remove the captured piece
      if (move.captured) {
        // For en passant, the captured pawn is on a different square
        if (move.flags.includes('e')) {
          const capturedSquare = `${toSquare[0]}${fromSquare[1]}`;
          removePiece(capturedSquare, true);
        } else {
          removePiece(toSquare, true);
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
    scene.background = new THREE.Color(SCENE_BACKGROUND_COLOR);

    // Camera setup
    const isMobile = containerRef.clientWidth < 768;
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.clientWidth / containerRef.clientHeight,
      0.1,
      1000
    );
    camera.position.set(3.5, isMobile ? 12 : 6, isMobile ? 12 : 12);
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

    // Create base
    const baseWidth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
    const baseDepth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
    const baseGeometry = new THREE.BoxGeometry(baseWidth, BASE_HEIGHT, baseDepth);
    const baseMaterial = createBaseMaterial(loadedTextures!);
    disposables.push(baseMaterial);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(
      (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2,
      -SQUARE_HEIGHT / 2 - BASE_HEIGHT / 2,
      (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2
    );
    base.receiveShadow = true;
    scene.add(base);

    // Create chessboard squares
    const squareMaterials = createSquareMaterials(loadedTextures!);
    disposables.push(squareMaterials.light, squareMaterials.dark);
    const squareGeometry = new THREE.BoxGeometry(SQUARE_SIZE, SQUARE_HEIGHT, SQUARE_SIZE);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const isLight = (row + col) % 2 === 0;
        const material = isLight ? squareMaterials.light : squareMaterials.dark;
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
