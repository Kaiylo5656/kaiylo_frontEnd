import React from 'react';

const ProgressChart = ({ data, type = 'line', title, height = 200 }) => {
  const renderLineChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => Math.max(d.completed, d.assigned)));
    const minValue = 0;
    const range = maxValue - minValue;

    return (
      <div className="relative" style={{ height: `${height}px` }}>
        <svg width="100%" height="100%" className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <line
              key={index}
              x1="0"
              y1={height * ratio}
              x2="100%"
              y2={height * ratio}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Data lines */}
          {data.length > 1 && (
            <>
              {/* Assigned line */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                points={data.map((d, index) => {
                  const x = (index / (data.length - 1)) * 400; // Use pixel width instead of percentage
                  const y = height - ((d.assigned - minValue) / range) * height;
                  return `${x},${y}`;
                }).join(' ')}
              />
              
              {/* Completed line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                points={data.map((d, index) => {
                  const x = (index / (data.length - 1)) * 400; // Use pixel width instead of percentage
                  const y = height - ((d.completed - minValue) / range) * height;
                  return `${x},${y}`;
                }).join(' ')}
              />
            </>
          )}
          
          {/* Data points */}
          {data.map((d, index) => {
            const x = (index / (data.length - 1)) * 400; // Use pixel width instead of percentage
            const yAssigned = height - ((d.assigned - minValue) / range) * height;
            const yCompleted = height - ((d.completed - minValue) / range) * height;
            
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={yAssigned}
                  r="3"
                  fill="#3b82f6"
                />
                <circle
                  cx={x}
                  cy={yCompleted}
                  r="3"
                  fill="#10b981"
                />
              </g>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="flex justify-center space-x-4 mt-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Assigned</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => Math.max(d.completed, d.assigned)));

    return (
      <div className="space-y-2" style={{ height: `${height}px` }}>
        {data.slice(-7).map((d, index) => {
          const completedHeight = (d.completed / maxValue) * (height - 40);
          const assignedHeight = (d.assigned / maxValue) * (height - 40);
          
          return (
            <div key={index} className="flex items-end space-x-1">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(d.date || d.weekStart).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex space-x-1">
                  <div
                    className="bg-blue-500 rounded-t"
                    style={{ height: `${assignedHeight}px`, width: '50%' }}
                    title={`Assigned: ${d.assigned}`}
                  ></div>
                  <div
                    className="bg-green-500 rounded-t"
                    style={{ height: `${completedHeight}px`, width: '50%' }}
                    title={`Completed: ${d.completed}`}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPieChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      );
    }

    const total = data.reduce((sum, d) => sum + d.total, 0);
    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      );
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    let currentAngle = 0;

    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <svg width={height} height={height} className="transform -rotate-90">
          {data.map((d, index) => {
            const percentage = (d.total / total) * 100;
            const angle = (percentage / 100) * 360;
            const radius = height / 2 - 20;
            const x = height / 2 + radius * Math.cos((currentAngle + angle / 2) * Math.PI / 180);
            const y = height / 2 + radius * Math.sin((currentAngle + angle / 2) * Math.PI / 180);
            
            const pathData = [
              `M ${height / 2} ${height / 2}`,
              `L ${height / 2 + radius * Math.cos(currentAngle * Math.PI / 180)} ${height / 2 + radius * Math.sin(currentAngle * Math.PI / 180)}`,
              `A ${radius} ${radius} 0 ${angle > 180 ? 1 : 0} 1 ${height / 2 + radius * Math.cos((currentAngle + angle) * Math.PI / 180)} ${height / 2 + radius * Math.sin((currentAngle + angle) * Math.PI / 180)}`,
              'Z'
            ].join(' ');

            currentAngle += angle;

            return (
              <path
                key={index}
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="ml-4 space-y-1">
          {data.map((d, index) => (
            <div key={index} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-sm text-gray-600">
                {d.category}: {d.total} ({Math.round((d.total / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'line':
      default:
        return renderLineChart();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {renderChart()}
    </div>
  );
};

export default ProgressChart;
