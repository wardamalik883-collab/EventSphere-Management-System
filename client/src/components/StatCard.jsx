/**
 * StatCard.jsx — Reusable Dashboard Metric Card
 */

import React from 'react';

const StatCard = ({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  badge,
  onClick,
}) => {
  return (
    <div
      className={`stat-card stat-card-${color} ${onClick ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <span className="stat-card-icon">{icon}</span>}
      </div>
      <div className="stat-card-body">
        <span className="stat-card-value">{value}</span>
        {badge && <span className="stat-card-badge">{badge}</span>}
      </div>
      {trend && <div className="stat-card-trend">{trend}</div>}
    </div>
  );
};

export default StatCard;
