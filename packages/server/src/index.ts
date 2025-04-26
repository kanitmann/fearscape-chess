import * as express from 'express';
import * as http from 'http';
import mongoose from 'mongoose';
import * as cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { SocketHandler } from './socket/SocketHandler';
import { GameService } from './services/game/GameService';
import { UserService } from './services/user/UserService';
import config from './config/config';

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(routes);

// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize services and socket handler
    const userService = new UserService();
    const gameService = new GameService(userService);
    new SocketHandler(server, gameService);
    
    // Start server
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  
  res.status(500).json({
    success: false,
    message: 'Server error'
  });
});