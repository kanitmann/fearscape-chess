import React from 'react';
import { Card, Badge } from 'antd';
import { formatTime } from '../../utils/timeUtils';

interface GameInfoProps {
  playerColor: 'white' | 'black';
  isPlayerTurn: boolean;
  playerTime: number;
  opponentTime: number;
  gameMode: 'standard' | 'blitz';
}

export const GameInfo: React.FC<GameInfoProps> = ({
  playerColor,
  isPlayerTurn,
  playerTime,
  opponentTime,
  gameMode
}) => {
  return (
    <Card title="Game Info" className="mb-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Mode:</span>
          <span className="capitalize">{gameMode}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="font-semibold">You:</span>
          <div className="flex items-center gap-2">
            <img 
              src={`/pieces/${playerColor === 'white' ? 'w' : 'b'}K.svg`} 
              alt={playerColor} 
              className="w-6 h-6" 
            />
            <span className="capitalize">{playerColor}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="font-semibold">Opponent:</span>
          <div className="flex items-center gap-2">
            <img 
              src={`/pieces/${playerColor === 'white' ? 'b' : 'w'}K.svg`} 
              alt={playerColor === 'white' ? 'black' : 'white'} 
              className="w-6 h-6" 
            />
            <span className="capitalize">{playerColor === 'white' ? 'black' : 'white'}</span>
          </div>
        </div>
        
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Your Time:</span>
            <span className={`${playerTime < 30 ? 'text-red-500' : ''} ${isPlayerTurn ? 'font-bold' : ''}`}>
              {formatTime(playerTime)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="font-semibold">Opponent Time:</span>
            <span className={`${opponentTime < 30 ? 'text-red-500' : ''} ${!isPlayerTurn ? 'font-bold' : ''}`}>
              {formatTime(opponentTime)}
            </span>
          </div>
        </div>
        
        <div className="mt-4 flex justify-center">
          <Badge 
            status={isPlayerTurn ? 'processing' : 'default'} 
            text={isPlayerTurn ? "Your Turn" : "Opponent's Turn"} 
            className={isPlayerTurn ? 'text-blue-500 font-bold' : ''}
          />
        </div>
      </div>
    </Card>
  );
};