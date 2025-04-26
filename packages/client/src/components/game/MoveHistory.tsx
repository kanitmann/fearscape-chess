import React from 'react';
import { Card, List } from 'antd';

interface MoveHistoryProps {
  moves: string[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  // Create paired move history (white, black)
  const moveHistory = [];
  
  for (let i = 0; i < moves.length; i += 2) {
    moveHistory.push({
      whiteMove: moves[i],
      blackMove: i + 1 < moves.length ? moves[i + 1] : ''
    });
  }
  
  return (
    <Card title="Move History" className="mb-4" bodyStyle={{ maxHeight: '200px', overflow: 'auto' }}>
      <List
        size="small"
        dataSource={moveHistory}
        renderItem={(item, index) => (
          <List.Item className="flex justify-between py-1">
            <div className="flex-1">
              <span className="text-gray-500 mr-2">{index + 1}.</span>
              <span>{item.whiteMove}</span>
            </div>
            <div className="flex-1 text-right">
              <span>{item.blackMove}</span>
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
};