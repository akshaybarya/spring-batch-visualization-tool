import React from 'react';
import './TimelineVisualization.css';

const TimelineVisualization = ({ simulationResult, config }) => {
  const [viewMode, setViewMode] = React.useState('enhanced'); // 'classic', 'enhanced', or 'actual'

  // Reset viewMode to 'enhanced' when Resource Validation is disabled
  React.useEffect(() => {
    if (!config?.enableResourceValidation && viewMode === 'actual') {
      setViewMode('enhanced');
    }
  }, [config?.enableResourceValidation, viewMode]);

  if (!simulationResult) return null;

  const { timeline, totalTime, partitions, usePartitioner } = simulationResult;
  
  // Calculate contention info
  const getContentionInfo = () => {
    if (!config?.enableResourceValidation) return null;
    
    const partitionWorkers = usePartitioner ? config.parallelPartitions : 1;
    const ioThreadsNeeded = partitionWorkers * 2;
    const workerThreadsNeeded = partitionWorkers * config.asyncPoolSize;
    
    const ioContention = ioThreadsNeeded > config.ioThreads;
    const workerContention = workerThreadsNeeded > config.workerThreads;
    
    if (!ioContention && !workerContention) return null;
    
    const ioWaitMultiplier = ioContention ? Math.ceil(ioThreadsNeeded / config.ioThreads) : 1;
    const workerWaitMultiplier = workerContention ? Math.ceil(workerThreadsNeeded / config.workerThreads) : 1;
    
    // Calculate actual total time with contention
    const ioWaitTime = ioContention ? totalTime * (ioWaitMultiplier - 1) * 0.3 : 0;
    const workerWaitTime = workerContention ? totalTime * (workerWaitMultiplier - 1) * 0.7 : 0;
    const actualTotalTime = totalTime + ioWaitTime + workerWaitTime;
    
    return {
      hasContention: true,
      ioContention,
      workerContention,
      ioWaitMultiplier,
      workerWaitMultiplier,
      ioThreadsNeeded,
      workerThreadsNeeded,
      ioThreadsAvailable: config.ioThreads,
      workerThreadsAvailable: config.workerThreads,
      ioWaitTime,
      workerWaitTime,
      actualTotalTime
    };
  };
  
  const contentionInfo = getContentionInfo();
  
  // Calculate actual timeline scale based on view mode
  const getActualTotalTime = () => {
    if (viewMode === 'actual' && contentionInfo) {
      return contentionInfo.actualTotalTime;
    }
    return totalTime;
  };
  
  const displayTotalTime = getActualTotalTime();

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

  // Get chunk-level events for detailed visualization
  const chunkEvents = timeline.filter(e => 
    e.type === 'chunk-read' || e.type === 'chunk-process' || e.type === 'chunk-write'
  );

  const groupedByStep = {};
  partitions.forEach((partition, idx) => {
    const stepName = partition.stepName;
    if (!groupedByStep[stepName]) {
      groupedByStep[stepName] = {
        startTime: partition.startTime,
        endTime: partition.endTime,
        chunks: [],
        partitionIndex: idx
      };
    }
    
    partition.chunks.forEach(chunk => {
      // Find corresponding events for this chunk
      const chunkId = chunk.chunk.id;
      const readEvent = chunkEvents.find(e => 
        e.stepName === stepName && e.chunkId === chunkId && e.type === 'chunk-read'
      );
      const processEvent = chunkEvents.find(e => 
        e.stepName === stepName && e.chunkId === chunkId && e.type === 'chunk-process'
      );
      const writeEvent = chunkEvents.find(e => 
        e.stepName === stepName && e.chunkId === chunkId && e.type === 'chunk-write'
      );

      groupedByStep[stepName].chunks.push({
        ...chunk,
        partitionIndex: idx,
        readEvent,
        processEvent,
        writeEvent
      });
    });
  });

  return (
    <div className="timeline-visualization">
      <div className="timeline-header-section">
        <h2>Job Execution Timeline</h2>
        <div className="view-mode-toggle">
          <button
            className={`toggle-btn ${viewMode === 'classic' ? 'active' : ''}`}
            onClick={() => setViewMode('classic')}
          >
            📊 Classic View
          </button>
          <button
            className={`toggle-btn ${viewMode === 'enhanced' ? 'active' : ''}`}
            onClick={() => setViewMode('enhanced')}
          >
            🎨 Enhanced View
          </button>
          {config?.enableResourceValidation && contentionInfo && (
            <button
              className={`toggle-btn actual-btn ${viewMode === 'actual' ? 'active' : ''}`}
              onClick={() => setViewMode('actual')}
            >
              ⏱️ Actual Timeline
            </button>
          )}
        </div>
      </div>
      
      {contentionInfo && viewMode !== 'actual' && (
        <div className="timeline-contention-banner">
          <div className="contention-alert">
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">
              Resource Contention Detected - This shows ideal execution. Click "Actual Timeline" to see real delays.
            </span>
          </div>
          <div className="contention-summary">
            {contentionInfo.ioContention && (
              <div className="contention-item io">
                <span className="item-icon">📥</span>
                <span>IO Threads: {contentionInfo.ioThreadsNeeded} needed / {contentionInfo.ioThreadsAvailable} available</span>
                <span className="wait-badge">{contentionInfo.ioWaitMultiplier}x wait</span>
              </div>
            )}
            {contentionInfo.workerContention && (
              <div className="contention-item worker">
                <span className="item-icon">⚙️</span>
                <span>Worker Threads: {contentionInfo.workerThreadsNeeded} needed / {contentionInfo.workerThreadsAvailable} available</span>
                <span className="wait-badge">{contentionInfo.workerWaitMultiplier}x wait</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {viewMode === 'actual' && contentionInfo && (
        <div className="timeline-actual-banner">
          <div className="actual-alert">
            <span className="alert-icon">⏱️</span>
            <span className="alert-text">
              Actual Timeline - Showing execution with thread contention delays
            </span>
          </div>
          <div className="actual-time-comparison">
            <div className="time-box ideal">
              <span className="time-label">Ideal Time</span>
              <span className="time-value">{totalTime.toFixed(2)}ms</span>
            </div>
            <span className="time-arrow">→</span>
            <div className="time-box actual">
              <span className="time-label">Actual Time</span>
              <span className="time-value">{contentionInfo.actualTotalTime.toFixed(2)}ms</span>
            </div>
            <div className="time-box overhead">
              <span className="time-label">Overhead</span>
              <span className="time-value">+{((contentionInfo.actualTotalTime - totalTime) / totalTime * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="timeline-container">
        <div className="timeline-header">
          <div className="time-markers">
            {[0, 25, 50, 75, 100].map(percent => (
              <div key={percent} className="time-marker" style={{ left: `${percent}%` }}>
                <span>{((displayTotalTime * percent) / 100).toFixed(0)}ms</span>
              </div>
            ))}
          </div>
        </div>

        <div className="timeline-tracks">
          {Object.entries(groupedByStep).map(([stepName, stepData]) => {
            // Calculate actual step times with contention delays
            const getActualTime = (time) => {
              if (viewMode === 'actual' && contentionInfo) {
                const scaleFactor = contentionInfo.actualTotalTime / totalTime;
                return time * scaleFactor;
              }
              return time;
            };
            
            const getActualScale = (time) => {
              return (getActualTime(time) / displayTotalTime) * 100;
            };
            
            const actualStepStart = getActualTime(stepData.startTime);
            const actualStepEnd = getActualTime(stepData.endTime);
            const actualStepDuration = actualStepEnd - actualStepStart;
            
            return (
            <div 
              key={stepName} 
              className={`step-track ${viewMode === 'classic' ? 'classic-mode' : (viewMode === 'actual' ? 'enhanced-mode actual-mode' : 'enhanced-mode')}`}
              style={(viewMode === 'enhanced' || viewMode === 'actual') ? { minHeight: `${35 + (stepData.chunks.length * 100) + 30}px` } : {}}
            >
              <div className="track-label">
                {(viewMode === 'enhanced' || viewMode === 'actual') ? (
                  <>
                    <div className="track-label-main">{stepName}</div>
                    <div className="track-label-sub">Worker {stepData.partitionIndex + 1}</div>
                    {viewMode === 'actual' && contentionInfo && (
                      <div className="track-label-delay">
                        ⏳ +{((actualStepDuration - (stepData.endTime - stepData.startTime))).toFixed(1)}ms delay
                      </div>
                    )}
                  </>
                ) : (
                  <div className="track-label-main">{stepName}</div>
                )}
              </div>
              <div 
                className="track-content"
                style={(viewMode === 'enhanced' || viewMode === 'actual') ? { minHeight: `${35 + (stepData.chunks.length * 100) + 20}px` } : {}}
              >
                <div 
                  className={`step-bar ${viewMode === 'actual' ? 'actual-step-bar' : ''}`}
                  style={{
                    left: `${getActualScale(stepData.startTime)}%`,
                    width: `${(getActualTime(stepData.endTime) - getActualTime(stepData.startTime)) / displayTotalTime * 100}%`,
                  }}
                >
                  <span className="step-duration">
                    {viewMode === 'actual' ? actualStepDuration.toFixed(2) : (stepData.endTime - stepData.startTime).toFixed(2)}ms
                  </span>
                </div>
                
                {(viewMode === 'enhanced' || viewMode === 'actual') ? (
                  /* Enhanced/Actual View: Detailed phase visualization */
                  stepData.chunks.map((chunk, idx) => {
                    const baseTop = 35;
                    const chunkHeight = 100;
                    const yOffset = baseTop + (idx * chunkHeight);
                    
                    // Calculate max width to not exceed step bar
                    const stepEndScale = getActualScale(stepData.endTime);
                    
                    const getClippedWidth = (eventTime, eventDuration) => {
                      const eventStart = getActualScale(eventTime);
                      const eventEnd = getActualScale(eventTime + eventDuration);
                      const clippedEnd = Math.min(eventEnd, stepEndScale);
                      return Math.max(0, clippedEnd - eventStart);
                    };
                    
                    return (
                      <div key={`${stepName}-chunk-${idx}`} className="chunk-container">
                        {/* Wait Period Indicator (only in actual mode) */}
                        {viewMode === 'actual' && contentionInfo && idx > 0 && (
                          <div
                            className="chunk-phase chunk-wait-phase"
                            style={{
                              left: `${getActualScale(stepData.chunks[idx-1].endTime)}%`,
                              width: `${Math.max(0, getActualScale(chunk.startTime) - getActualScale(stepData.chunks[idx-1].endTime))}%`,
                              top: `${yOffset}px`
                            }}
                            title={`Thread waiting - contention delay`}
                          >
                            <span className="phase-label">⏳ Wait</span>
                            <span className="phase-badge">BLOCKED</span>
                          </div>
                        )}
                        
                        {/* Synchronous Read Phase */}
                        {chunk.readEvent && (
                          <div
                            className={`chunk-phase chunk-read-phase ${viewMode === 'actual' && contentionInfo?.ioContention ? 'contention-phase' : ''}`}
                            style={{
                              left: `${getActualScale(chunk.readEvent.time)}%`,
                              width: `${getClippedWidth(chunk.readEvent.time, chunk.readEvent.duration)}%`,
                              top: `${yOffset}px`
                            }}
                            title={`[SYNC READ] Chunk ${chunk.chunk.id}: ${chunk.chunk.itemCount} items, ${chunk.readEvent.duration.toFixed(2)}ms${viewMode === 'actual' && contentionInfo?.ioContention ? ' (IO CONTENTION)' : ''}`}
                          >
                            <span className="phase-label">📖 C{chunk.chunk.id}</span>
                            <span className="phase-badge">{viewMode === 'actual' && contentionInfo?.ioContention ? 'DELAYED' : 'SYNC'}</span>
                          </div>
                        )}
                        
                        {/* Async Process Phase */}
                        {chunk.processEvent && (
                          <div
                            className={`chunk-phase chunk-process-phase ${viewMode === 'actual' && contentionInfo?.workerContention ? 'contention-phase' : ''}`}
                            style={{
                              left: `${getActualScale(chunk.processEvent.time)}%`,
                              width: `${getClippedWidth(chunk.processEvent.time, chunk.processEvent.duration)}%`,
                              top: `${yOffset + 26}px`
                            }}
                            title={`${chunk.processEvent.description}${viewMode === 'actual' && contentionInfo?.workerContention ? ' (WORKER CONTENTION - threads queued)' : ''}`}
                          >
                            <span className="phase-label">⚙️ Process</span>
                            <span className="phase-badge">{viewMode === 'actual' && contentionInfo?.workerContention ? 'QUEUED' : 'ASYNC'}</span>
                          </div>
                        )}
                        
                        {/* Async Write Phase */}
                        {chunk.writeEvent && (
                          <div
                            className={`chunk-phase chunk-write-phase ${viewMode === 'actual' && contentionInfo?.ioContention ? 'contention-phase' : ''}`}
                            style={{
                              left: `${getActualScale(chunk.writeEvent.time)}%`,
                              width: `${getClippedWidth(chunk.writeEvent.time, chunk.writeEvent.duration)}%`,
                              top: `${yOffset + 52}px`
                            }}
                            title={`${chunk.writeEvent.description}${viewMode === 'actual' && contentionInfo?.ioContention ? ' (IO CONTENTION)' : ''}`}
                          >
                            <span className="phase-label">✍️ Write</span>
                            <span className="phase-badge">{viewMode === 'actual' && contentionInfo?.ioContention ? 'DELAYED' : 'ASYNC'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Classic View: Simple chunk bars */
                  stepData.chunks.map((chunk, idx) => (
                    <div
                      key={`${stepName}-chunk-${idx}`}
                      className="chunk-bar-classic"
                      style={{
                        left: `${getTimelineScale(chunk.startTime)}%`,
                        width: `${getTimelineScale(chunk.endTime - chunk.startTime)}%`,
                        top: `${30 + (idx % 3) * 25}px`
                      }}
                      title={`Chunk ${chunk.chunk.id}: ${chunk.chunk.itemCount} items, ${(chunk.endTime - chunk.startTime).toFixed(2)}ms`}
                    >
                      <span className="chunk-label">C{chunk.chunk.id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
          })}
        </div>
      </div>

      <div className="timeline-legend">
        <h3>Legend</h3>
        {(viewMode === 'enhanced' || viewMode === 'actual') ? (
          <>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
                <span>Step Execution (Worker Thread)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#06b6d4' }}></div>
                <span>📖 Synchronous Read (Sequential)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ec4899' }}></div>
                <span>⚙️ Async Process (Parallel Pool)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#84cc16' }}></div>
                <span>✍️ Async Write (Parallel Pool)</span>
              </div>
              {viewMode === 'actual' && contentionInfo && (
                <>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span>⏳ Wait Period (Thread Blocked)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color contention-indicator"></div>
                    <span>🔴 Contention (Delayed/Queued)</span>
                  </div>
                </>
              )}
            </div>
            <div className="legend-note">
              {viewMode === 'actual' ? (
                <><strong>Note:</strong> This view shows actual execution with thread contention delays. 
                Phases marked as DELAYED or QUEUED are waiting for available threads.</>
              ) : (
                <><strong>Note:</strong> Async operations (Process & Write) run in parallel using thread pool. 
                Read operations are synchronous and sequential within each worker.</>
              )}
            </div>
          </>
        ) : (
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
        )}
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
