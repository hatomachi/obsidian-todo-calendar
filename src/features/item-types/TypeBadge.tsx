import React from 'react';
import { Rocket, Calculator, AlertTriangle, Tag, CheckSquare, Zap, Shield, Bookmark } from 'lucide-react';
import { ItemType } from './types';

interface TypeBadgeProps {
  itemType?: ItemType;
  customLabel?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export const renderTypeIcon = (iconName?: string, size = 12) => {
  switch (iconName) {
    case 'rocket':
      return <Rocket size={size} />;
    case 'calculator':
      return <Calculator size={size} />;
    case 'alert-triangle':
      return <AlertTriangle size={size} />;
    case 'check-square':
      return <CheckSquare size={size} />;
    case 'zap':
      return <Zap size={size} />;
    case 'shield':
      return <Shield size={size} />;
    case 'bookmark':
      return <Bookmark size={size} />;
    default:
      return <Tag size={size} />;
  }
};

export const TypeBadge: React.FC<TypeBadgeProps> = ({
  itemType,
  customLabel,
  size = 'sm',
  onClick,
}) => {
  if (!itemType && !customLabel) return null;

  const label = customLabel || itemType?.name || '';
  const color = itemType?.color || 'blue';
  const icon = itemType?.icon || 'tag';

  return (
    <span
      className={`item-type-badge badge-color-${color} badge-size-${size} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      title={`タイプ: ${label}`}
    >
      {renderTypeIcon(icon, size === 'sm' ? 11 : 13)}
      <span className="type-badge-text">{label}</span>
    </span>
  );
};
