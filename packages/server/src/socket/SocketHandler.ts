import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { GameService } from '../services/game/GameService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { Move, Position } from '@fearscape-chess/shared';
import config from '../config/config';

// Add user property to Socket
interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
  };
}

export class SocketHandler {
  private io: Server;
  private gameService: GameService;
  private userSocketMap: Map<string, AuthenticatedSocket> = new Map();
  
  constructor(httpServer: HttpServer, gameService: GameService) {
    this.gameService = gameService;
    
    // Initialize Socket.IO
    this.io = new Server(httpServer, {
      cors: {
        origin: config.clientUrl,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    // Set up authentication middleware
    this.io.use(this.authenticate);
    
    // Set up connection handler
    this.io.on('connection', this.handleConnection);
  }
  
  // Socket authentication middleware
  private authenticate = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    // Extract token from handshake auth
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      // Verify the token
      const user = await AuthMiddleware.verifyToken(token);
      
      if (!user) {
        return next(new Error('Authentication error'));
      }
      
      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  };
  
  // Handle socket connection
  private handleConnection = (socket: AuthenticatedSocket) => {
    const user = socket.user;
    
    if (!user) {
      socket.disconnect();
      return;
    }
    
    // Store user socket mapping
    this.userSocketMap.set(user.id, socket);
    
    console.log(`User connected: ${user.id}`);
    
    // Set up event handlers
    this.setupEventHandlers(socket);
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.id}`);
      this.userSocketMap.delete(user.id);
    });
  };
  
  // Set up socket event handlers
  private setupEventHandlers(socket: AuthenticatedSocket) {
    const user = socket.user;
    
    if (!user) return;
    
    // Handle joining a game
    socket.on('game:join', (data: { gameId: string }) => {
      socket.join(data.gameId);
      
      // Get current game state
      const game = this.gameService.getGame(data.gameId);
      
      if (game) {
        // Determine player color
        const playerColor = user.id === game.playerIds.white ? 'white' : 'black';
        
        // Send initial game state to the user
        socket.emit('game:state', {
          state: game.state,
          fogState: game.fogState[playerColor],
          playerColor,
          timers: game.timers,
          gameMode: game.gameMode
        });
      }
    });
    
    // Handle making a move
    socket.on('game:move', (data: { gameId: string, move: Move, fogReveals: string[] }) => {
      const { gameId, move, fogReveals } = data;
      
      // Make the move in the game service
      const result = this.gameService.makeMove(gameId, user.id, move);
      
      if (result.success) {
        // Get the opponent ID to send them the move
        const game = this.gameService.getGame(gameId);
        
        if (game) {
          const playerColor = user.id === game.playerIds.white ? 'white' : 'black';
          const opponentId = playerColor === 'white' ? game.playerIds.black : game.playerIds.white;
          
          // Send move to the opponent
          const opponentSocket = this.userSocketMap.get(opponentId);
          if (opponentSocket) {
            opponentSocket.emit('game:opponentMove', {
              move,
              fogReveals,
              state: result.state
            });
          }
          
          // Broadcast time update to both players
          this.io.to(gameId).emit('game:timeUpdate', {
            white: game.timers.white,
            black: game.timers.black
          });
        }
      } else {
        // Send error back to the client
        socket.emit('game:error', {
          message: result.error
        });
      }
    });
    
    // Handle fog reveal
    socket.on('game:revealFog', (data: { gameId: string, position: Position }) => {
      const { gameId, position } = data;
      
      const result = this.gameService.revealFog(gameId, user.id, position);
      
      if (!result.success) {
        socket.emit('game:error', {
          message: result.error
        });
      }
    });
  }
}