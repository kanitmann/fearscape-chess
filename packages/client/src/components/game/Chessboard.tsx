import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { Chess, Square  } from 'chess.js';
import { useParams } from 'react-router-dom';
import { message, Modal, Button } from 'antd';
import useGameStore from '../../store/gameStore';
import useAuthStore from '../../store/authStore';
import { socket } from '../../services/socket';
import { FogOfWarService } from '../../services/fogOfWarService';
import { GameService } from '../../services/gameService';
import { PromotionModal } from './PromotionModal';
import { GameInfo } from './GameInfo';
import { MoveHistory } from './MoveHistory';
import FogEffect from './FogEffect';

interface ChessboardProps {
  gameMode: 'standard' | 'blitz';
  timeControl: number; // in seconds
}

const Chessboard: React.FC<ChessboardProps> = ({ gameMode, timeControl }) => {
  // Game state
  const [game, setGame] = useState<Chess>(new Chess());
  const [fen, setFen] = useState<string>(game.fen());
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [visibleSquares, setVisibleSquares] = useState<Set<string>>(new Set());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [showPromotionModal, setShowPromotionModal] = useState<boolean>(false);
  const [promotionMove, setPromotionMove] = useState<{ from: string; to: string } | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<string>('');
  const [revealedPieces, setRevealedPieces] = useState<Record<string, boolean>>({});
  
  // References
  const gameRef = useRef<Chess>(game);
  
  // Get stores
  const { gameId } = useParams<{ gameId: string }>();
  const {  user: currentUser } = useAuthStore();
  const { 
    updateGameState, 
    opponentId, 
    setOpponentId,
    playerTimer,
    opponentTimer,
    updatePlayerTimer,
    updateOpponentTimer
  } = useGameStore();
  
  // Timers
  const playerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const opponentTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      try {
        if (gameId) {
          const gameData = await GameService.getGame(gameId);
          
          // Set up the game state
          const newGame = new Chess(gameData.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
          gameRef.current = newGame;
          setGame(newGame);
          setFen(newGame.fen());
          
          // Set player color
          const isPlayerWhite = gameData.whitePlayerId === currentUser?.id;
          setPlayerColor(isPlayerWhite ? 'white' : 'black');
          setIsPlayerTurn(isPlayerWhite === (newGame.turn() === 'w'));
          
          // Set opponent
          setOpponentId(isPlayerWhite ? gameData.blackPlayerId : gameData.whitePlayerId);
          
          // Set timers
          updatePlayerTimer(gameData.playerTimeRemaining);
          updateOpponentTimer(gameData.opponentTimeRemaining);
          
          // Initialize fog of war
          initializeFogOfWar(isPlayerWhite);
          
          // Set move history
          if (gameData.moves && gameData.moves.length > 0) {
            setMoveHistory(gameData.moves);
          }
          
          // Check if game is over
          if (gameData.status !== 'active') {
            setGameOver(true);
            setGameResult(gameData.result || '');
          }
        }
      } catch (error) {
        console.error('Error initializing game:', error);
        message.error('Failed to load the game. Please try again.');
      }
    };
    
    initGame();
    
    return () => {
      // Clean up timers
      if (playerTimerRef.current) {
        clearInterval(playerTimerRef.current);
      }
      if (opponentTimerRef.current) {
        clearInterval(opponentTimerRef.current);
      }
    };
  }, [gameId, currentUser?.id, updatePlayerTimer, updateOpponentTimer]);
  
  // Socket event listeners
  useEffect(() => {
    if (!gameId) return;
    
    // Join game room
    socket.emit('join-game', { gameId, userId: currentUser?.id });
    
    // Listen for opponent moves
    socket.on('move-made', (data) => {
      if (data.gameId === gameId && data.userId !== currentUser?.id) {
        handleOpponentMove(data.move);
      }
    });
    
    // Listen for fog reveals
    // socket.on('fog-reveal', (data) => {
    //   if (data.gameId === gameId) {
    //     handleFogReveal(data.squares);
    //   }
    // });
    
    // Listen for game over events
    socket.on('game-over', (data) => {
      if (data.gameId === gameId) {
        handleGameOver(data.result);
      }
    });
    
    // Clean up socket listeners on unmount
    return () => {
      socket.off('move-made');
      socket.off('fog-reveal');
      socket.off('game-over');
      socket.emit('leave-game', { gameId, userId: currentUser?.id });
    };
  }, [gameId, currentUser?.id]);
  
  // Timer logic
  useEffect(() => {
    if (gameOver) {
      // Clear all timers when game is over
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
      if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);
      return;
    }
    
    // Start or stop timers based on whose turn it is
    if (isPlayerTurn) {
      // Stop opponent timer
      if (opponentTimerRef.current) {
        clearInterval(opponentTimerRef.current);
        opponentTimerRef.current = null;
      }
      
      // Start player timer
      if (!playerTimerRef.current) {
        playerTimerRef.current = setInterval(() => {
          updatePlayerTimer(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              // Time's up, player loses
              handleTimeOut();
              return 0;
            }
            return newTime;
          });
        }, 1000);
      }
    } else {
      // Stop player timer
      if (playerTimerRef.current) {
        clearInterval(playerTimerRef.current);
        playerTimerRef.current = null;
      }
      
      // Start opponent timer
      if (!opponentTimerRef.current) {
        opponentTimerRef.current = setInterval(() => {
          updateOpponentTimer(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              // Don't handle time out here, server will notify
              return 0;
            }
            return newTime;
          });
        }, 1000);
      }
    }
    
    return () => {
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
      if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);
    };
  }, [isPlayerTurn, gameOver, updatePlayerTimer, updateOpponentTimer]);
  
  // Initialize fog of war
  const initializeFogOfWar = useCallback((isPlayerWhite: boolean) => {
    // Create initial visible squares set based on player color
    const initialVisible = new Set<string>();
    
    // Player can see their first 3 rows
    const playerRows = isPlayerWhite ? ['1', '2', '3'] : ['6', '7', '8'];
    
    // Player can see the middle 2 rows (rows 4 and 5)
    const middleRows = ['4', '5'];
    
    // Add visible squares to the set
    for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      for (const row of [...playerRows, ...middleRows]) {
        initialVisible.add(`${file}${row}`);
      }
    }
    
    setVisibleSquares(initialVisible);
    
    // Initialize revealed pieces
    const initialRevealedPieces: Record<string, boolean> = {};
    const squares = game.board();
    
    squares.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece) {
          const file = String.fromCharCode(97 + colIndex); // Convert 0-7 to a-h
          const rank = 8 - rowIndex; // Convert 0-7 to 8-1
          const square = `${file}${rank}`;
          
          // If square is visible, mark piece as revealed
          initialRevealedPieces[square] = initialVisible.has(square);
        }
      });
    });
    
    setRevealedPieces(initialRevealedPieces);
  }, [game]);
  
  // Handle opponent's move
  const handleOpponentMove = useCallback((moveData: { from: string; to: string; promotion?: string }) => {
    try {
      const { from, to, promotion } = moveData;
      const newGame = new Chess(gameRef.current.fen());
      
      // Make the move
      newGame.move({
        from,
        to,
        promotion: promotion || undefined
      });
      
      // Update the game state
      gameRef.current = newGame;
      setGame(newGame);
      setFen(newGame.fen());
      
      // Update move history
      const moveNotation = newGame.history({ verbose: false }).pop() || '';
      setMoveHistory(prev => [...prev, moveNotation]);
      
      // Update turn status
      setIsPlayerTurn(true);
      
      // Check for game over conditions
      checkGameOver(newGame);
      
      // Process fog of war updates
      processOpponentMoveForFog(from, to);
      
    } catch (error) {
      console.error('Error processing opponent move:', error);
      message.error('There was an error processing the opponent\'s move.');
    }
  }, []);
  
  // Process opponent move for fog of war updates
  const processOpponentMoveForFog = useCallback((from: string, to: string) => {
    // Check if this move should trigger a fog reveal
    const revealedSquares = FogOfWarService.calculateRevealedSquares(
      from, 
      to, 
      playerColor, 
      gameRef.current, 
      visibleSquares,
      gameMode
    );
    
    if (revealedSquares.length > 0) {
      // Update visible squares
      const newVisibleSquares = new Set(visibleSquares);
      revealedSquares.forEach(square => newVisibleSquares.add(square));
      setVisibleSquares(newVisibleSquares);
      
      // Update revealed pieces
      const newRevealedPieces = { ...revealedPieces };
      
      // Get all pieces from the current board
      const squares = gameRef.current.board();
      squares.forEach((row, rowIndex) => {
        row.forEach((piece, colIndex) => {
          if (piece) {
            const file = String.fromCharCode(97 + colIndex); // Convert 0-7 to a-h
            const rank = 8 - rowIndex; // Convert 0-7 to 8-1
            const square = `${file}${rank}`;
            
            // If the square is now visible, mark piece as revealed
            if (newVisibleSquares.has(square)) {
              newRevealedPieces[square] = true;
            }
          }
        });
      });
      
      setRevealedPieces(newRevealedPieces);
      
      // Play reveal sound effect
      if (revealedSquares.length > 0) {
        playRevealSound();
      }
    }
  }, [playerColor, visibleSquares, revealedPieces, gameMode]);
  
  // Handle player's move
  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!isPlayerTurn || gameOver) return false;
    
    try {
      // Check if this is a pawn promotion move
      const piece = gameRef.current.get(sourceSquare as Square);

      const isPawnPromotion = 
        piece?.type === 'p' && 
        ((piece.color === 'w' && targetSquare[1] === '8') || 
         (piece.color === 'b' && targetSquare[1] === '1'));
      
      if (isPawnPromotion) {
        setPromotionMove({ from: sourceSquare, to: targetSquare });
        setShowPromotionModal(true);
        return false; // Don't make the move yet, wait for promotion choice
      }
      
      // Make a regular move
      return makeMove(sourceSquare, targetSquare);
    } catch (error) {
      console.error('Error making move:', error);
      message.error('Invalid move. Please try again.');
      return false;
    }
  }, [isPlayerTurn, gameOver]);
  
  // Make a move
  const makeMove = useCallback((sourceSquare: string, targetSquare: string, promotion?: string) => {
    try {
      const newGame = new Chess(gameRef.current.fen());
      
      // Make the move
      const moveResult = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion || undefined
      });
      
      if (moveResult === null) {
        return false; // Invalid move
      }
      
      // Update the game state
      gameRef.current = newGame;
      setGame(newGame);
      setFen(newGame.fen());
      
      // Update move history
      const moveNotation = newGame.history({ verbose: false }).pop() || '';
      setMoveHistory(prev => [...prev, moveNotation]);
      
      // Update turn status
      setIsPlayerTurn(false);
      
      // Process fog of war updates for the player's move
      processMoveForFog(sourceSquare, targetSquare);
      
      // Emit move to server
      socket.emit('make-move', {
        gameId,
        userId: currentUser?.id,
        move: {
          from: sourceSquare,
          to: targetSquare,
          promotion: promotion || undefined
        }
      });
      
      // Check for game over conditions
      checkGameOver(newGame);
      
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      message.error('Invalid move. Please try again.');
      return false;
    }
  }, [gameId, currentUser?.id]);
  
  // Handle pawn promotion
  const handlePromotion = useCallback((promotionPiece: 'q' | 'r' | 'b' | 'n') => {
    if (promotionMove) {
      const success = makeMove(promotionMove.from, promotionMove.to, promotionPiece);
      if (success) {
        setShowPromotionModal(false);
        setPromotionMove(null);
      }
    }
  }, [promotionMove, makeMove]);
  
  // Process player's move for fog of war updates
  const processMoveForFog = useCallback((from: string, to: string) => {
    // Check if this move should trigger a fog reveal
    const revealedSquares = FogOfWarService.calculateRevealedSquares(
      from, 
      to, 
      playerColor, 
      gameRef.current, 
      visibleSquares,
      gameMode
    );
    
    if (revealedSquares.length > 0) {
      // Update visible squares
      const newVisibleSquares = new Set(visibleSquares);
      revealedSquares.forEach(square => newVisibleSquares.add(square));
      setVisibleSquares(newVisibleSquares);
      
      // Update revealed pieces
      const newRevealedPieces = { ...revealedPieces };
      
      // Get all pieces from the current board
      const squares = gameRef.current.board();
      squares.forEach((row, rowIndex) => {
        row.forEach((piece, colIndex) => {
          if (piece) {
            const file = String.fromCharCode(97 + colIndex); // Convert 0-7 to a-h
            const rank = 8 - rowIndex; // Convert 0-7 to 8-1
            const square = `${file}${rank}`;
            
            // If the square is now visible, mark piece as revealed
            if (newVisibleSquares.has(square)) {
              newRevealedPieces[square] = true;
            }
          }
        });
      });
      
      setRevealedPieces(newRevealedPieces);
      
      // Emit fog reveal to server
      socket.emit('fog-reveal', {
        gameId,
        userId: currentUser?.id,
        squares: revealedSquares
      });
      
      // Play reveal sound effect
      if (revealedSquares.length > 0) {
        playRevealSound();
      }
    }
  }, [playerColor, visibleSquares, revealedPieces, gameId, currentUser?.id, gameMode]);
  
  // Check for game over conditions
  const checkGameOver = useCallback((gameInstance: Chess) => {
    if (gameInstance.isCheckmate()) {
      const winner = gameInstance.turn() === 'w' ? 'black' : 'white';
      handleGameOver(winner === playerColor ? 'win' : 'loss');
    } else if (gameInstance.isDraw()) {
      handleGameOver('draw');
    } else if (gameInstance.isStalemate()) {
      handleGameOver('stalemate');
    } else if (gameInstance.isThreefoldRepetition()) {
      handleGameOver('repetition');
    } else if (gameInstance.isInsufficientMaterial()) {
      handleGameOver('insufficient');
    }
  }, [playerColor]);
  
  // Handle game over
  const handleGameOver = useCallback((result: string) => {
    setGameOver(true);
    setGameResult(result);
    
    // Clear timers
    if (playerTimerRef.current) {
      clearInterval(playerTimerRef.current);
      playerTimerRef.current = null;
    }
    if (opponentTimerRef.current) {
      clearInterval(opponentTimerRef.current);
      opponentTimerRef.current = null;
    }
    
    // Update game state on server
    GameService.updateGameStatus(gameId || '', result);
    
    // Determine message based on result
    let resultMessage = '';
    if (result === 'win') {
      resultMessage = 'You won the game!';
    } else if (result === 'loss') {
      resultMessage = 'You lost the game.';
    } else if (result === 'draw' || result === 'stalemate' || 
               result === 'repetition' || result === 'insufficient') {
      resultMessage = 'The game ended in a draw.';
    } else if (result === 'timeout_win') {
      resultMessage = 'You won on time!';
    } else if (result === 'timeout_loss') {
      resultMessage = 'You lost on time.';
    }
    
    // Show game over modal
    Modal.info({
      title: 'Game Over',
      content: resultMessage,
      okText: 'Return to Lobby',
      onOk: () => {
        window.location.href = '/lobby';
      }
    });
  }, [gameId]);
  
  // Handle timeout
  const handleTimeOut = useCallback(() => {
    if (gameOver) return;
    
    // Emit timeout to server
    socket.emit('player-timeout', {
      gameId,
      userId: currentUser?.id
    });
    
    // Handle game over locally
    handleGameOver('timeout_loss');
  }, [gameId, currentUser?.id, gameOver, handleGameOver]);
  
  // Play reveal sound
  const playRevealSound = useCallback(() => {
    // Play a sound effect when fog is revealed
    const revealSound = new Audio('/sounds/reveal.mp3');
    revealSound.volume = 0.5;
    revealSound.play().catch(error => {
      console.error('Error playing sound:', error);
    });
  }, []);
  
  // Custom piece renderer to handle fog of war
  const customPieces = useCallback(() => {
    const pieces: Record<string, (squareWidth: number) => React.ReactNode> = {};
    const pieceTypes = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
    
    pieceTypes.forEach((pieceType) => {
      pieces[pieceType] = (squareWidth: number) => (
        <div className="relative w-full h-full">
          <img 
            src={`/pieces/${pieceType}.svg`} 
            alt={pieceType} 
            className="w-full h-full" 
            style={{ opacity: 1 }}
          />
        </div>
      );
    });
    
    return pieces;
  }, []);
  
  // Square renderer - determines if a square should be visible or hidden in fog
  const squareRenderer = useCallback(
    ({ squareColor, children, square }: { squareColor: string; children: React.ReactNode; square: string }) => {
      const isVisible = visibleSquares.has(square);
      
      return (
        <div
          className={`relative ${squareColor === 'white' ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'} w-full h-full`}
        >
          {isVisible ? (
            children
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <FogEffect />
            </div>
          )}
        </div>
      );
    },
    [visibleSquares]
  );
  
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-3/4">
        <div className="relative" style={{ aspectRatio: '1/1' }}>
        <ReactChessboard
          position={fen}
          onPieceDrop={onDrop}
          boardOrientation={playerColor}
          customSquareStyles={{}}
          customDarkSquareStyle={{ backgroundColor: '#b58863' }}
          customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
          customPieces={customPieces()}
        />
        </div>
      </div>
      
      <div className="w-full md:w-1/4">
        <GameInfo
          playerColor={playerColor}
          isPlayerTurn={isPlayerTurn}
          playerTime={playerTimer}
          opponentTime={opponentTimer}
          gameMode={gameMode}
        />
        
        <MoveHistory moves={moveHistory} />
        
        <div className="mt-4">
          <Button 
            type="primary" 
            danger 
            className="w-full"
            onClick={() => {
              Modal.confirm({
                title: 'Resign Game',
                content: 'Are you sure you want to resign this game?',
                okText: 'Resign',
                okType: 'danger',
                cancelText: 'Cancel',
                onOk: () => {
                  socket.emit('resign-game', {
                    gameId,
                    userId: currentUser?.id
                  });
                  handleGameOver('loss');
                }
              });
            }}
            disabled={gameOver}
          >
            Resign
          </Button>
        </div>
      </div>
      
      {/* Promotion Modal */}
      <PromotionModal
        visible={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        onSelectPromotion={handlePromotion}
        playerColor={playerColor === 'white' ? 'w' : 'b'}
      />
    </div>
  );
};

export default Chessboard;