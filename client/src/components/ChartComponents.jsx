/**
 * ChartComponents.jsx — Pure SVG & CSS Responsive Data Visualizations
 * Task 13: Timeseries line charts, distribution bar charts, and donut progress gauges.
 *
 * Features:
 *  - 100% React 18 compatible, zero external chart library overhead
 *  - Responsive SVG viewbox scaling
 *  - Interactive data points with hover tooltips
 *  - Print-friendly vector rendering for PDF / paper reports
 */

import React, { useState } from 'react';

/**
 * Responsive SVG Line Chart for Timeseries Data
 */
export function LineChart({
  data = [],
  color = '#6366f1',
  fillColor = 'rgba(99, 102, 241, 0.12)',
  height = 220,
  title,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-box">
        {title && <h4 className="chart-box-title">{title}</h4>}
        <p className="chart-empty-text">No timeseries data available for this range</p>
      </div>
    );
  }

  // Calculate scales
  const values = data.map((d) => d.count || d.value || 0);
  const maxVal = Math.max(...values, 5); // At least 5 for scale breathing room
  const minVal = 0;

  const svgWidth = 600;
  const svgHeight = height;
  const padding = { top: 20, right: 25, bottom: 35, left: 40 };

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Coordinate mapping
  const points = data.map((d, i) => {
    const val = d.count || d.value || 0;
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, date: d.date || d.label, val };
  });

  // Build SVG path strings
  const linePath = points.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : '';

  // Y-axis grid ticks (4 ticks)
  const yTicks = [0, Math.round(maxVal * 0.33), Math.round(maxVal * 0.66), maxVal];

  // X-axis label skip to prevent crowding
  const xLabelInterval = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="svg-chart-container">
      {title && <h4 className="chart-box-title">{title}</h4>}

      <div className="svg-wrap" style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="responsive-svg-chart"
          preserveAspectRatio="none"
        >
          {/* Defs for gradients */}
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-labels */}
          {yTicks.map((tickVal, idx) => {
            const yPos = padding.top + chartHeight - ((tickVal - minVal) / (maxVal - minVal)) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={svgWidth - padding.right}
                  y2={yPos}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="end"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaPath && (
            <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
          )}

          {/* Line Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint === i ? 6 : 3.5}
              fill="#ffffff"
              stroke={color}
              strokeWidth={hoveredPoint === i ? 3 : 2}
              style={{ cursor: 'pointer', transition: 'r 0.15s, stroke-width 0.15s' }}
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* X-axis Labels */}
          {points.map((pt, i) => {
            if (i % xLabelInterval !== 0 && i !== points.length - 1) return null;
            // Shorten date string (YYYY-MM-DD -> MM/DD)
            const parts = (pt.date || '').split('-');
            const displayDate = parts.length === 3 ? `${parts[1]}/${parts[2]}` : pt.date;

            return (
              <text
                key={i}
                x={pt.x}
                y={svgHeight - 10}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
              >
                {displayDate}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint !== null && points[hoveredPoint] && (
          <div
            className="chart-tooltip"
            style={{
              position: 'absolute',
              left: `${(points[hoveredPoint].x / svgWidth) * 100}%`,
              top: `${(points[hoveredPoint].y / svgHeight) * 100}%`,
              transform: 'translate(-50%, -125%)',
              pointerEvents: 'none',
              background: '#0f172a',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
            }}
          >
            <div>{points[hoveredPoint].date}</div>
            <div style={{ color: '#a5b4fc' }}>{points[hoveredPoint].val} entries</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Distribution Bar Chart Component
 */
export function BarChart({ data = [], title }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-box">
        {title && <h4 className="chart-box-title">{title}</h4>}
        <p className="chart-empty-text">No distribution data available</p>
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div className="barchart-container">
      {title && <h4 className="chart-box-title">{title}</h4>}

      <div className="barchart-list">
        {data.map((item, idx) => {
          const val = item.value || 0;
          const pct = item.percentage !== undefined
            ? item.percentage
            : (total > 0 ? Number(((val / total) * 100).toFixed(1)) : 0);

          return (
            <div key={idx} className="barchart-item">
              <div className="barchart-meta-row">
                <span className="barchart-label">{item.label}</span>
                <span className="barchart-numbers">
                  <strong>{val}</strong> ({pct}%)
                </span>
              </div>
              <div className="barchart-track">
                <div
                  className="barchart-fill"
                  style={{
                    width: `${Math.max(pct, 1)}%`,
                    backgroundColor: item.color || '#6366f1',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Circular SVG Donut Progress Indicator
 */
export function DonutProgress({
  percentage = 0,
  label = 'Occupancy',
  sublabel = '',
  color = '#6366f1',
  size = 140,
  strokeWidth = 12,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div className="donut-progress-container" style={{ width: size, textAlign: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>

        {/* Center Text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {safePct}%
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {label}
          </span>
        </div>
      </div>

      {sublabel && (
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '6px 0 0' }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
