import React from 'react';
import './TimelineVisualization.css';

const TimelineVisualization = ({ simulationResult }) => {
  if (!simulationResult) return null;

  const { timeline, totalTime, partitions } = simulationResult;

  const getTimelineScale = (time) => {
    return (time / totalTime) * 100;
  };

  const getColorForType = (type) => {
    const colors = {
      'job-start': '#10b981',
      'job-end': '#ef4444',
      'partitioner': '#8b5cf6',
      'step-start': '#3b82f6',
      'step-end': '#3b82f6',
      'chunk-start': '#f59e0b',
      'chunk-read': '#06b6d4',
      'chunk-process': '#ec4899',
      'chunk-write': '#84cc16',
      'chunk-end': '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  const groupedByStep = {};
  partitions.forEach((partition, idx) => {
    const stepName = partition.stepName;
    if (!groupedByStep[stepName]) {
      groupedByStep[stepName] = {
        startTime: partition.startTime,
        endTime: partition.endTime,
        chunks: []
      };
    }
    
    partition.chunks.forEach(chunk => {
      groupedByStep[stepName].chunks.push({
        ...chunk,
        partitionIndex: idx
      });
    });
  });

  return (
    <div className="timeline-visualization">
      <h2>Job Execution Timeline</h2>
      
      <div className="timeline-container">
        <div className="timeline-header">
          <div className="time-markers">
            {[0, 25, 50, 75, 100].map(percent => (
              <div key={percent} className="time-marker" style={{ left: `${percent}%` }}>
                <span>{((totalTime * percent) / 100).toFixed(0)}ms</span>
              </div>
            ))}
          </div>
        </div>

        <div className="timeline-tracks">
          {Object.entries(groupedByStep).map(([stepName, stepData]) => (
            <div key={stepName} className="step-track">
              <div className="track-label">{stepName}</div>
              <div className="track-content">
                <div 
                  className="step-bar"
                  style={{
                    left: `${getTimelineScale(stepData.startTime)}%`,
                    width: `${getTimelineScale(stepData.endTime - stepData.startTime)}%`,
                  }}
                >
                  <span className="step-duration">
                    {(stepData.endTime - stepData.startTime).toFixed(2)}ms
                  </span>
                </div>
                
                {stepData.chunks.map((chunk, idx) => (
                  <div
                    key={`${stepName}-chunk-${idx}`}
                    className="chunk-bar"
                    style={{
                      left: `${getTimelineScale(chunk.startTime)}%`,
                      width: `${getTimelineScale(chunk.endTime - chunk.startTime)}%`,
                      top: `${30 + (idx % 3) * 25}px`
                    }}
                    title={`Chunk ${chunk.chunk.id}: ${chunk.chunk.itemCount} items, ${(chunk.endTime - chunk.startTime).toFixed(2)}ms`}
                  >
                    <span className="chunk-label">C{chunk.chunk.id}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="timeline-legend">
        <h3>Legend</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Step Execution</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Chunk Processing</span>
          </div>
        </div>
      </div>

      <div className="event-log">
        <h3>Event Log</h3>
        <div className="event-list">
          {timeline.map((event, idx) => (
            <div key={idx} className="event-item" style={{ borderLeftColor: getColorForType(event.type) }}>
              <span className="event-time">{event.time.toFixed(2)}ms</span>
              <span className="event-type">{event.type}</span>
              <span className="event-description">{event.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineVisualization;
