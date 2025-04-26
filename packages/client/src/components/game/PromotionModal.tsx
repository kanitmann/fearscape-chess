import React from 'react';
import { Modal } from 'antd';

interface PromotionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPromotion: (piece: 'q' | 'r' | 'b' | 'n') => void;
  playerColor: 'w' | 'b';
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  visible,
  onClose,
  onSelectPromotion,
  playerColor
}) => {
  const promotionPieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; name: string }> = [
    { type: 'q', name: 'Queen' },
    { type: 'r', name: 'Rook' },
    { type: 'b', name: 'Bishop' },
    { type: 'n', name: 'Knight' }
  ];
  
  return (
    <Modal
      title="Pawn Promotion"
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      closable={false}
      maskClosable={false}
    >
      <div className="flex justify-center items-center gap-4">
        {promotionPieces.map(piece => (
          <div
            key={piece.type}
            className="cursor-pointer p-2 hover:bg-gray-100 rounded transition-colors duration-200 flex flex-col items-center"
            onClick={() => onSelectPromotion(piece.type)}
          >
            <img
              src={`/pieces/${playerColor}${piece.type.toUpperCase()}.svg`}
              alt={piece.name}
              className="w-16 h-16"
            />
            <span className="mt-2 text-center">{piece.name}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
};