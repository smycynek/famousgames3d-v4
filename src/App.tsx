import { createSignal, For } from 'solid-js';
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

function App() {
  const [gameList, setGameList] = createSignal<ParsedGame[]>([...games]);
  const [selectedGame, setSelectedGame] = createSignal<ParsedGame | null>(games[0] || null);
  const [moveIndex, setMoveIndex] = createSignal(-1);
  const [isPlaying, setIsPlaying] = createSignal(false);
  let playIntervalId: number | undefined;
  let fileInputRef: HTMLInputElement | undefined;
  const [showAbout, setShowAbout] = createSignal(false);

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

  const stopPlayback = () => {
    if (playIntervalId) {
      clearInterval(playIntervalId);
      playIntervalId = undefined;
    }
    setIsPlaying(false);
  };

  const handlePlay = () => {
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

      // Then continue with regular interval for subsequent moves
      playIntervalId = setInterval(() => {
        setMoveIndex((prev) => {
          const next = prev + 1;
          if (next >= totalMoves) {
            stopPlayback();
            return prev;
          }
          return next;
        });
      }, 1500) as unknown as number;
    }, 300);
  };

  const handleReset = () => {
    stopPlayback();
    setMoveIndex(-1);
  };

  const handleStepForward = () => {
    stopPlayback();
    const totalMoves = getTotalMoves();
    if (moveIndex() < totalMoves - 1) {
      setMoveIndex((prev) => prev + 1);
    }
  };

  const handleStepBack = () => {
    stopPlayback();
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
        <h1>FAMOUS GAMES 3D</h1>
        <div class="controls">
          <select id="game-select" onChange={handleGameSelect} value={selectedGame()?.name}>
            <For each={gameList()}>
              {(game) => (
                <option value={game.name}>
                  {game.parsed[0]?.tags?.White || 'Unknown'} Vs.{' '}
                  {game.parsed[0]?.tags?.Black || 'Unknown'}
                </option>
              )}
            </For>
          </select>
          <button class="upload-btn" onClick={handleUploadPgn} title="Upload a PGN">
            <img src={uploadIcon} alt="Upload a PGN" class="button-icon" />
          </button>
          <input
            type="file"
            accept=".pgn"
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
            {!isPlaying() && moveIndex() < getTotalMoves() - 1 && (
              <img
                src={(moveIndex() + 1) % 2 === 0 ? whiteKingIcon : blackKingIcon}
                alt={(moveIndex() + 1) % 2 === 0 ? 'White to move' : 'Black to move'}
              />
            )}
          </span>
          <span class="move-counter">
            {String(moveIndex() + 1).padStart(3, '0')}/{String(getTotalMoves()).padStart(3, '0')}
          </span>
          <span class="score">
            {moveIndex() >= getTotalMoves() - 1
              ? selectedGame()?.parsed[0]?.tags?.Result || '----'
              : '----'}
          </span>
        </div>
      )}
      <Chessboard game={selectedGame()} moveIndex={moveIndex()} />
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
      {showAbout() && (
        <div class="about-overlay" onClick={() => setShowAbout(false)}>
          <div class="about-dialog" onClick={(e) => e.stopPropagation()}>
            <h1 class="about-title">ABOUT FAMOUS GAMES 3D</h1>
            <p>
              Play back famous chess games from history, or upload your own PGN files to visualize
              them in 3D! Pieces modeled in{' '}
              <a href="https://cad.onshape.com/documents/1ac43c0042a8a0544e84feed/w/276b025152b1f726b298cef5/e/c3193025dfaf1a651f190a93">
                Onshape.
              </a>
            </p>
            <p>
              Gameplay in <code>SolidJS</code>, <code>ThreeJS</code>, and <code>chess.js</code>.
              PGN-parsing with <code>@mliebelt/pgn-parser. </code>
              Animation with <code>gsap</code>.
            </p>
            <p class="credits">Copyright Steven Mycynek 2026. MIT license</p>
            <a href="https://github.com/smycynek/famousgames3d-v4" class="credits">
              https://github.com/smycynek/famousgames3d-v4
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
