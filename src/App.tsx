import { createSignal, createEffect, For } from 'solid-js';
import './App.css';
import Chessboard from './Chessboard';
import { games, parseGame, type ParsedGame } from './assets/games';
import pauseIcon from './assets/icons/pause.svg';
import playIcon from './assets/icons/play.svg';
import resetIcon from './assets/icons/reset.svg';
import forwardIcon from './assets/icons/forward.svg';
import backIcon from './assets/icons/back.svg';
import whiteKingIcon from './assets/icons/whiteKing.svg';
import blackKingIcon from './assets/icons/blackKing.svg';
import uploadIcon from './assets/icons/upload.svg';
import infoIcon from './assets/icons/info.svg';

const NORMAL_MOVE_DELAY = 1500;
const CAPTURE_MOVE_DELAY = 3000; // wait for capture animation to finish
const ANIMATION_DELAY = 2000; // match crown delay in Chessboard
const MOVE_ANIMATION_DURATION = 1000; // match ANIMATION_DURATION in Chessboard (1s)

function App() {
  const [gameList, setGameList] = createSignal<ParsedGame[]>([...games]);
  const [selectedGame, setSelectedGame] = createSignal<ParsedGame | null>(games[0] || null);
  const [moveIndex, setMoveIndex] = createSignal(-1);
  const [isPlaying, setIsPlaying] = createSignal(false);
  let playIntervalId: number | undefined;
  let fileInputRef: HTMLInputElement | undefined;
  const [assetsLoaded, setAssetsLoaded] = createSignal(false);
  const [showAbout, setShowAbout] = createSignal(false);
  const [showGameInfo, setShowGameInfo] = createSignal(false);
  const [showScore, setShowScore] = createSignal(false);
  const [isAnimating, setIsAnimating] = createSignal(false);
  let lastMoveDirection: 'forward' | 'backward' = 'forward';
  let animatingTimeout: ReturnType<typeof setTimeout> | null = null;
  let scoreTimeout: ReturnType<typeof setTimeout> | null = null;

  const handleGameSelect = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    const gameName = select.value;
    stopPlayback();
    setMoveIndex(-1);
    if (gameName) {
      const game = gameList().find((g) => g.name === gameName);
      setSelectedGame(game || null);
      console.log('Selected game:', game?.parsed);
    } else {
      setSelectedGame(null);
    }
  };

  const getTotalMoves = () => {
    const game = selectedGame();
    if (!game) return 0;
    return game.parsed[0]?.moves?.length || 0;
  };

  createEffect(() => {
    const idx = moveIndex();
    const total = getTotalMoves();
    if (animatingTimeout) {
      clearTimeout(animatingTimeout);
      animatingTimeout = null;
    }
    if (idx >= 0 && lastMoveDirection === 'forward') {
      setIsAnimating(true);
      animatingTimeout = setTimeout(() => {
        animatingTimeout = null;
        setIsAnimating(false);
      }, MOVE_ANIMATION_DURATION);
    } else {
      setIsAnimating(false);
    }
    if (scoreTimeout) {
      clearTimeout(scoreTimeout);
      scoreTimeout = null;
    }
    setShowScore(false);
    if (idx >= total - 1 && total > 0) {
      scoreTimeout = setTimeout(() => {
        scoreTimeout = null;
        setShowScore(true);
      }, ANIMATION_DELAY);
    }
  });

  const stopPlayback = () => {
    if (playIntervalId) {
      clearTimeout(playIntervalId);
      playIntervalId = undefined;
    }
    setIsPlaying(false);
  };

  const isCaptureMove = (idx: number): boolean => {
    const game = selectedGame();
    if (!game) return false;
    const moves = game.parsed[0]?.moves;
    if (!moves || idx < 0 || idx >= moves.length) return false;
    const notation = moves[idx]?.notation?.notation || '';
    return notation.includes('x');
  };

  const scheduleNextMove = () => {
    const totalMoves = getTotalMoves();
    const currentIdx = moveIndex();
    const delay = isCaptureMove(currentIdx) ? CAPTURE_MOVE_DELAY : NORMAL_MOVE_DELAY;

    playIntervalId = setTimeout(() => {
      setMoveIndex((prev) => {
        const next = prev + 1;
        if (next >= totalMoves) {
          stopPlayback();
          return prev;
        }
        return next;
      });
      if (isPlaying()) {
        scheduleNextMove();
      }
    }, delay) as unknown as number;
  };

  const handlePlay = () => {
    lastMoveDirection = 'forward';
    const game = selectedGame();
    if (!game) return;

    if (isPlaying()) {
      stopPlayback();
      return;
    }

    setIsPlaying(true);
    const totalMoves = getTotalMoves();

    // If at the end, restart from beginning
    if (moveIndex() >= totalMoves - 1) {
      setMoveIndex(-1);
    }

    // Start the first move with a shorter delay
    setTimeout(() => {
      setMoveIndex((prev) => {
        const next = prev + 1;
        if (next >= totalMoves) {
          stopPlayback();
          return prev;
        }
        return next;
      });
      scheduleNextMove();
    }, 300);
  };

  const handleReset = () => {
    stopPlayback();
    setMoveIndex(-1);
  };

  const handleStepForward = () => {
    stopPlayback();
    lastMoveDirection = 'forward';
    const totalMoves = getTotalMoves();
    if (moveIndex() < totalMoves - 1) {
      setMoveIndex((prev) => prev + 1);
    }
  };

  const handleStepBack = () => {
    stopPlayback();
    lastMoveDirection = 'backward';
    if (moveIndex() >= 0) {
      setMoveIndex((prev) => prev - 1);
    }
  };

  const handleUploadPgn = () => {
    fileInputRef?.click();
  };

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const pgnContent = reader.result as string;
        const parsed = parseGame(file.name, pgnContent);
        if (!parsed.parsed[0]?.moves?.length) {
          throw new Error('No moves found');
        }
        setGameList((prev) => [...prev, parsed]);
        stopPlayback();
        setMoveIndex(-1);
        setSelectedGame(parsed);
      } catch {
        alert('Error reading PGN');
      }
    };
    reader.onerror = () => {
      alert('Error reading PGN');
    };
    reader.readAsText(file);
    input.value = '';
  };

  return (
    <div class="app">
      <div class="header-row">
        <h1>{assetsLoaded() ? 'FAMOUS GAMES 3D' : 'FAMOUS GAMES 3D (LOADING...)'}</h1>
        <div class="controls">
          <select
            title="Select a game"
            id="game-select"
            onChange={handleGameSelect}
            value={selectedGame()?.name}
          >
            <For each={gameList()}>
              {(game) => (
                <option value={game.name}>
                  {game.parsed[0]?.tags?.White || 'Unknown'} Vs.{' '}
                  {game.parsed[0]?.tags?.Black || 'Unknown'}
                </option>
              )}
            </For>
          </select>
          <button class="info-btn" onClick={() => setShowGameInfo(true)} title="Game Info">
            <img src={infoIcon} alt="Game Info" class="button-icon" />
          </button>
          <button class="upload-btn" onClick={handleUploadPgn} title="Upload a PGN">
            <img src={uploadIcon} alt="Upload a PGN" class="button-icon" />
          </button>
          <input
            type="file"
            accept="text/pgn"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>
      {selectedGame() && (
        <div class="controls-row">
          <div class="playback-controls">
            <button onClick={handleReset} title="Reset">
              <img src={resetIcon} alt="Reset" class="button-icon" />
            </button>
            <button onClick={handleStepBack} title="Step Back">
              <img src={backIcon} alt="Step Back" class="button-icon" />
            </button>
            <button onClick={handlePlay} title={isPlaying() ? 'Pause' : 'Play'}>
              {isPlaying() ? (
                <img src={pauseIcon} alt="Pause" class="button-icon" />
              ) : (
                <img src={playIcon} alt="Play" class="button-icon" />
              )}
            </button>
            <button onClick={handleStepForward} title="Step Forward">
              <img src={forwardIcon} alt="Forward" class="button-icon" />
            </button>
          </div>
          <span class="turn-icon">
            {!isPlaying() && !isAnimating() && moveIndex() < getTotalMoves() - 1 && (
              <img
                title={(moveIndex() + 1) % 2 === 0 ? 'White to move' : 'Black to move'}
                src={(moveIndex() + 1) % 2 === 0 ? whiteKingIcon : blackKingIcon}
                alt={(moveIndex() + 1) % 2 === 0 ? 'White to move' : 'Black to move'}
              />
            )}
          </span>
          <span title="Current move" class="move-counter">
            {String(moveIndex() + 1).padStart(3, '0')}/{String(getTotalMoves()).padStart(3, '0')}
          </span>
          <span title="Game result">
            {showScore() ? selectedGame()?.parsed[0]?.tags?.Result || '----' : '----'}
          </span>
        </div>
      )}
      <Chessboard
        game={selectedGame()}
        moveIndex={moveIndex()}
        onLoaded={() => setAssetsLoaded(true)}
      />
      <div class="footer-row">
        <a
          class="notes"
          href="https://github.com/smycynek/famousgames3d-v4"
          style={{ color: 'black' }}
        >
          https://github.com/smycynek/famousgames3d-v4
        </a>
        <button class="about-btn" onClick={() => setShowAbout(true)} title="About">
          <img src={infoIcon} alt="About" class="button-icon" />
        </button>
      </div>
      {showGameInfo() && (
        <div class="about-overlay" onClick={() => setShowGameInfo(false)}>
          <div class="game-info-dialog" onClick={() => setShowGameInfo(false)}>
            <h1 class="game-info-title">GAME INFO</h1>
            <p>
              <strong>White:</strong> {selectedGame()?.parsed[0]?.tags?.White || 'Unknown'}
            </p>
            <p>
              <strong>Black:</strong> {selectedGame()?.parsed[0]?.tags?.Black || 'Unknown'}
            </p>
            <p>
              <strong>Event:</strong> {selectedGame()?.parsed[0]?.tags?.Event || 'Unknown'}
            </p>
            <p>
              <strong>Site:</strong> {selectedGame()?.parsed[0]?.tags?.Site || 'Unknown'}
            </p>
            <p>
              <strong>Date:</strong>{' '}
              {selectedGame()?.parsed[0]?.tags?.Date?.value ||
                selectedGame()?.parsed[0]?.tags?.Date ||
                'Unknown'}
            </p>
            <p>
              <strong>Winner:</strong>{' '}
              {selectedGame()?.parsed[0]?.tags?.Result === '1-0'
                ? 'White'
                : selectedGame()?.parsed[0]?.tags?.Result === '0-1'
                  ? 'Black'
                  : selectedGame()?.parsed[0]?.tags?.Result === '1/2-1/2'
                    ? 'Draw'
                    : 'Unknown'}
            </p>
          </div>
        </div>
      )}
      {showAbout() && (
        <div class="about-overlay" onClick={() => setShowAbout(false)}>
          <div class="about-dialog" onClick={(e) => e.stopPropagation()}>
            <h1 class="about-title">ABOUT FAMOUS GAMES 3D</h1>
            <p class="about-content">
              Play back famous chess games from history, or upload your own{' '}
              <a href="https://en.wikipedia.org/wiki/Portable_Game_Notation">PGN</a> files to
              visualize them in 3D! (Desktop only) Pieces modeled in{' '}
              <a href="https://cad.onshape.com/documents/1ac43c0042a8a0544e84feed/w/276b025152b1f726b298cef5/e/c3193025dfaf1a651f190a93">
                Onshape.
              </a>{' '}
              Gameplay in <a href="https://www.solidjs.com/">SolidJS</a>,{' '}
              <a href="https://threejs.org/">ThreeJS</a>, and{' '}
              <a href="https://www.npmjs.com/package/chess.js">chess.js.</a> PGN-parsing with{' '}
              <a href="https://www.npmjs.com/package/@mliebelt/pgn-parser">@mliebelt/pgn-parser.</a>{' '}
              Animation with <a href="https://www.npmjs.com/package/gsap">gsap.</a>
            </p>
            <p class="credits">Copyright Steven Mycynek 2026. MIT license</p>
            <a href="https://github.com/smycynek/famousgames3d-v4" class="credits">
              https://github.com/smycynek/famousgames3d-v4
            </a>

            <div class="playback-controls">
              <button class="ok" onClick={() => setShowAbout(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
