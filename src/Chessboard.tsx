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
  type LoadedTextures,
  SCENE_BACKGROUND_COLOR,
  SCENE_BACKGROUND_COLOR_2,
} from './materials';
import {
  SQUARE_SIZE,
  SQUARE_HEIGHT,
  buildBase,
  buildTable,
  buildPedestal,
  buildFloor,
  buildChairs,
  buildSquares,
  buildMolding,
  buildLabels,
  type SceneBuilderParams,
} from './sceneBuilder';
import {
  PIECE_TYPES,
  PIECE_BASE_SIZE,
  ANIMATION_DURATION,
  KNIGHT_HOP_HEIGHT,
  PIECE_SCALES,
  PIECE_TYPE_MAP,
  type PieceType,
  type PieceModels,
  type PieceInfo,
  createGradientBackground,
  scalePieceToFit,
  createPieceInstance,
  placePiece,
  toSquareName,
  fromSquareName,
} from './pieceUtils';
import { getGraveyardPosition } from './graveyardUtils';
import { clearCrowns, scheduleCrowns } from './crownManager';

interface ChessboardProps {
  game?: ParsedGame | null;
  moveIndex?: number;
  onLoaded?: () => void;
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
  let crownModel: THREE.Group | null = null;
  const crownMeshes: THREE.Group[] = [];
  const crownTimeout: { current: ReturnType<typeof setTimeout> | null } = { current: null };

  onMount(() => {
    if (!containerRef) return;

    // Scene setup
    const scene = new THREE.Scene();

    // Load all textures
    loadedTextures = loadTextures();
    Object.values(loadedTextures).forEach((t) => textureList.push(t));

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
        PIECE_SCALES[pieceType],
        texture
      );
      placePiece(piece, col, row, scene, isBlack);
      // Rotate knights on Z axis
      if (pieceType === 'knight') {
        piece.rotation.z += isBlack ? Math.PI / 4 + Math.PI : -Math.PI / 4;
      }
      return { mesh: piece, type: pieceType, isBlack };
    };

    // Create a piece positioned in the graveyard (for captured pieces during board rebuild)
    const createGraveyardPiece = (
      pm: PieceModels,
      pieceType: PieceType,
      isBlack: boolean,
      capturedList: THREE.Group[]
    ) => {
      const captureIndex = capturedList.length;
      const { x, y, z } = getGraveyardPosition(isBlack, captureIndex);

      const texture = isBlack ? loadedTextures?.darkWood : loadedTextures?.lightWood;
      const color = isBlack ? BLACK_PIECE_COLOR : WHITE_PIECE_COLOR;
      const piece = createPieceInstance(
        pm[pieceType],
        color,
        disposables,
        PIECE_SCALES[pieceType],
        texture
      );

      piece.position.set(x, y, z);
      piece.rotation.z = Math.PI / 2;
      piece.rotation.x = isBlack ? Math.PI / 2 : Math.PI / 2 + Math.PI;
      if (isBlack) {
        piece.rotation.y = Math.PI;
      }
      if (pieceType === 'knight') {
        piece.rotation.z += isBlack ? Math.PI / 4 + Math.PI : -Math.PI / 4;
      }

      scene.add(piece);
      capturedList.push(piece);
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

      // Rotate 30 degrees on vertical axis during move
      const rotationDelta = (15 * Math.PI) / 180;
      gsap.to(piece.rotation, {
        duration: 0.5,
        delay: ANIMATION_DURATION - 0.5,
        z: piece.rotation.z + rotationDelta,
        ease: 'power2.inOut',
      });

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

    // Animate a captured piece to the graveyard
    const animateCapture = (info: PieceInfo, capturedList: THREE.Group[], delay: number) => {
      const captureIndex = capturedList.length;
      capturedList.push(info.mesh);
      const {
        x: targetX,
        y: targetY,
        z: targetZ,
      } = getGraveyardPosition(info.isBlack, captureIndex);

      // Raise up quickly and high to avoid collision, move to side, then lower
      gsap.to(info.mesh.position, {
        duration: ANIMATION_DURATION * 0.4,
        delay: delay,
        y: info.mesh.position.y + SQUARE_SIZE * 2.1,
        ease: 'power2.out',
      });
      gsap.to(info.mesh.position, {
        duration: ANIMATION_DURATION * 0.9,
        delay: delay + ANIMATION_DURATION * 0.4,
        x: targetX,
        z: targetZ,
        ease: 'power2.inOut',
      });
      gsap.to(info.mesh.position, {
        duration: ANIMATION_DURATION * 0.5,
        delay: delay + ANIMATION_DURATION * 1.3,
        y: targetY,
        ease: 'power2.in',
      });
    };

    // Remove a piece with optional animation and delay - moves captured pieces to the side
    const removePiece = (squareName: string, animate: boolean = false, delay: number = 0) => {
      const info = piecesBySquare.get(squareName);
      if (info) {
        if (animate) {
          const capturedList = info.isBlack ? capturedBlackPieces : capturedWhitePieces;
          animateCapture(info, capturedList, delay);
        } else {
          scene.remove(info.mesh);
        }
        piecesBySquare.delete(squareName);
      }
    };

    // Animate promotion: replace pawn with promoted piece and flash brightness
    const animatePromotion = (
      pm: PieceModels,
      toSquare: string,
      toCol: number,
      toRow: number,
      promotedType: PieceType,
      isBlack: boolean
    ) => {
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
    };

    // Set up the board from a chess position (no animation - used for initial setup)
    const setupBoardFromChess = (
      chess: Chess,
      pm: PieceModels,
      captures?: { type: string; color: 'w' | 'b' }[]
    ) => {
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

      // Place captured pieces in the graveyard
      if (captures) {
        for (const cap of captures) {
          const pieceType = PIECE_TYPE_MAP[cap.type];
          const isBlack = cap.color === 'b';
          const capturedList = isBlack ? capturedBlackPieces : capturedWhitePieces;
          createGraveyardPiece(pm, pieceType, isBlack, capturedList);
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
        const captureDelay = ANIMATION_DURATION * 0.6;
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
        animatePromotion(pm, toSquare, toCol, toRow, promotedType, isBlack);
      }

      currentChess = chess;
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

      // Load crown model
      try {
        const crownBasePath = import.meta.env.BASE_URL + 'other/';
        const crownGltf = await loader.loadAsync(`${crownBasePath}crown.gltf`);
        crownModel = crownGltf.scene;
        scalePieceToFit(crownModel, PIECE_BASE_SIZE * 2.5);
        console.log('Loaded crown model');
      } catch (error) {
        console.error('Failed to load crown:', error);
      }

      setPieceModels(models as PieceModels);
      console.log('All chess pieces loaded');
      props.onLoaded?.();

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

      // Remove any existing crowns and cancel pending crown placement
      clearCrowns(scene, crownMeshes, crownTimeout);

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
        const captures: { type: string; color: 'w' | 'b' }[] = [];
        for (let i = 0; i <= moveIndex && i < moves.length; i++) {
          const move = moves[i];
          if (move.notation?.notation) {
            try {
              const result = chess.move(move.notation.notation);
              if (result?.captured) {
                // captured color is opposite of the moving color
                captures.push({
                  type: result.captured,
                  color: result.color === 'w' ? 'b' : 'w',
                });
              }
            } catch (e) {
              console.error(`Invalid move: ${move.notation.notation}`, e);
              break;
            }
          }
        }
        setupBoardFromChess(chess, pm, captures);
      }

      // Place crown(s) on winner's chair at the last move
      if (crownModel && moveIndex === moves.length - 1) {
        const result = parsedGame?.tags?.Result;
        scheduleCrowns(scene, crownModel, crownMeshes, crownTimeout, disposables, result);
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
    renderer.localClippingEnabled = true;
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
    controls.maxPolarAngle = Math.PI / 2 - 0.2;
    controls.update();

    // Lighting
    const lights = buildLights();
    lights.forEach((light) => scene.add(light));

    // Build scene elements
    const builderParams: SceneBuilderParams = {
      scene,
      textures: loadedTextures!,
      disposables,
      textureList,
    };

    const baseGeometry = buildBase(builderParams);
    const tableGeometry = buildTable(builderParams);
    buildPedestal(builderParams);
    buildFloor(builderParams);
    buildChairs(builderParams);
    const squareGeometry = buildSquares(builderParams);
    buildMolding(builderParams);
    const labelGeometry = buildLabels(builderParams);

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
      tableGeometry.dispose();
      labelGeometry.dispose();
      disposables.forEach((m) => m.dispose());
      textureList.forEach((t) => t.dispose());
    });
  });

  return <div border-style="solid" ref={containerRef} class="chessboard-container" />;
}

export default Chessboard;
