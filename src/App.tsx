import { createSignal, For } from 'solid-js';
import './App.css';
import Chessboard from './Chessboard';
import { games, type ParsedGame } from './assets/games';
import pauseIcon from './assets/icons/pause.svg';
import playIcon from './assets/icons/play.svg';
import resetIcon from './assets/icons/reset.svg';
import forwardIcon from './assets/icons/forward.svg';
import backIcon from './assets/icons/back.svg';
import whiteKingIcon from './assets/icons/whiteKing.svg';
import blackKingIcon from './assets/icons/blackKing.svg';

function App() {
  const [selectedGame, setSelectedGame] = createSignal<ParsedGame | null>(games[0] || null);
  const [moveIndex, setMoveIndex] = createSignal(-1);
  const [isPlaying, setIsPlaying] = createSignal(false);
  let playIntervalId: number | undefined;

  const handleGameSelect = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    const gameName = select.value;
    stopPlayback();
    setMoveIndex(-1);
    if (gameName) {
      const game = games.find((g) => g.name === gameName);
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

  return (
    <div class="app">
      <h1>FAMOUS GAMES 3D</h1>
      <label style={{ color: 'black', 'font-size': '0.85rem' }} for="game-select">
        Select a game and hit 'Play.''
      </label>
      <div class="controls">
        <select id="game-select" onChange={handleGameSelect} value={selectedGame()?.name}>
          <For each={games}>
            {(game) => (
              <option value={game.name}>
                {game.parsed[0]?.tags?.White || 'Unknown'} Vs.{' '}
                {game.parsed[0]?.tags?.Black || 'Unknown'}
              </option>
            )}
          </For>
        </select>
      </div>
      {selectedGame() && (
        <>
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
          <div
            class="move-counter"
            style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'min-height': '36px',
            }}
          >
            <span style={{ width: '40px', display: 'inline-block', 'text-align': 'right' }}>
              {!isPlaying() && (
                <img
                  src={(moveIndex() + 1) % 2 === 0 ? whiteKingIcon : blackKingIcon}
                  alt={(moveIndex() + 1) % 2 === 0 ? 'White to move' : 'Black to move'}
                  style={{
                    width: '32px',
                    height: '32px',
                    'vertical-align': 'middle',
                  }}
                />
              )}
            </span>
            <span style={{ 'text-align': 'left' }}>
              Move: {String(moveIndex() + 1).padStart(3, '0')} /{' '}
              {String(getTotalMoves()).padStart(3, '0')}
              <span style={{ 'margin-left': '1rem' }}>
                Score:{' '}
                {moveIndex() >= getTotalMoves() - 1
                  ? selectedGame()?.parsed[0]?.tags?.Result || '?'
                  : '?'}
              </span>
            </span>
          </div>
        </>
      )}
      <Chessboard game={selectedGame()} moveIndex={moveIndex()} />

      <div class="notes">
        Developed with <a href="https://claude.ai/new">Claude Code.</a> Pieces modeled in{' '}
        <a href="https://www.onshape.com/en/">Onshape</a>
      </div>
      <a
        class="notes"
        href="https://github.com/smycynek/famousgames3d-v4"
        style={{ 'text-align': 'left', display: 'block', color: 'black' }}
      >
        https://github.com/smycynek/famousgames3d-v4
      </a>
    </div>
  );
}

export default App;
