import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout, Typography, message } from 'antd';
import Chessboard from '../../components/game/Chessboard';
import { useGameStore } from '../../store/gameStore';
import useAuthStore from '../../store/authStore';
import { GameService } from '../../services/gameService';
import { getSocket, initSocket } from '../../services/socket';

const { Header, Content } = Layout;
const { Title } = Typography;

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { updateGameState } = useGameStore();
  const { user } = useAuthStore();
  
  useEffect(() => {
    // Initialize socket connection if needed
    try {
      const token = localStorage.getItem('token');
      if (token) {
        initSocket(token);
      }
    } catch (error) {
      console.error('Socket connection error:', error);
      message.error('Failed to connect to the game server.');
    }
    
    // Update game state with game ID
    if (gameId) {
      updateGameState(gameId);
      
      // Join the game room
      if (user) {
        GameService.joinGame(gameId, user.id);
      }
    }
    
    // Clean up - leave game room on unmount
    return () => {
      if (gameId && user) {
        GameService.leaveGame(gameId, user.id);
      }
    };
  }, [gameId, user, updateGameState]);
  
  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center justify-between bg-[#0A192F] text-white">
        <Title level={3} className="text-white m-0">
          Fearscape Chess
        </Title>
      </Header>
      
      <Content className="p-4 md:p-8 max-w-6xl mx-auto w-full">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          {gameId && <Chessboard gameMode="standard" timeControl={600} />}
        </div>
      </Content>
    </Layout>
  );
};

export default GamePage;