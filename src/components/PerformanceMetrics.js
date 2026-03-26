import React from 'react';
import './PerformanceMetrics.css';

const PerformanceMetrics = ({ simulationResult, config }) => {
  if (!simulationResult) return null;

  const { totalTime, totalItems, partitions, usePartitioner, resourceValidation } = simulationResult;

  const calculateMetrics = () => {
    const throughput = (totalItems / totalTime) * 1000;
    const avgPartitionTime = partitions.reduce((sum, p) => sum + (p.endTime - p.startTime), 0) / partitions.length;
    
    const allChunks = partitions.flatMap(p => p.chunks);
    const avgChunkTime = allChunks.reduce((sum, c) => sum + (c.endTime - c.startTime), 0) / allChunks.length;
    
    const totalChunks = allChunks.length;
    const itemsPerChunk = totalItems / totalChunks;

    return {
      throughput,
      avgPartitionTime,
      avgChunkTime,
      totalChunks,
      itemsPerChunk,
      totalPartitions: partitions.length
    };
  };

  const metrics = calculateMetrics();

  const calculateEfficiency = () => {
    const allChunks = partitions.flatMap(p => p.chunks);
    const totalSequentialTime = allChunks.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);
    const efficiency = (totalSequentialTime / totalTime) * 100;
    return Math.min(efficiency, 100);
  };

  const efficiency = calculateEfficiency();

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getCompletionTime = () => {
    const now = new Date();
    const completionDate = new Date(now.getTime() + totalTime);
    return completionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="performance-metrics">
      <h2>Performance Metrics</h2>
      
      <div className="job-timing-section">
        <div className="timing-card">
          <div className="timing-icon">🕐</div>
          <div className="timing-content">
            <div className="timing-label">Job Start Time</div>
            <div className="timing-value">{getCurrentTime()}</div>
          </div>
        </div>
        <div className="timing-card">
          <div className="timing-icon">⏱️</div>
          <div className="timing-content">
            <div className="timing-label">Execution Duration</div>
            <div className="timing-value">{formatTime(totalTime)}</div>
          </div>
        </div>
        <div className="timing-card completion">
          <div className="timing-icon">🏁</div>
          <div className="timing-content">
            <div className="timing-label">Job Completion Time</div>
            <div className="timing-value">{getCompletionTime()}</div>
            <div className="timing-subtitle">Job will be available at this time</div>
          </div>
        </div>
      </div>
      
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <div className="metric-label">Total Execution Time</div>
            <div className="metric-value">{totalTime.toFixed(2)} ms</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-label">Throughput</div>
            <div className="metric-value">{metrics.throughput.toFixed(2)} items/sec</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <div className="metric-label">Total Items Processed</div>
            <div className="metric-value">{totalItems.toLocaleString()}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⚡</div>
          <div className="metric-content">
            <div className="metric-label">Parallelization Efficiency</div>
            <div className="metric-value">{efficiency.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="metrics-details">
        <div className="detail-section">
          <h3>Partition Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Partitioning Enabled:</span>
              <span className="detail-value">{usePartitioner ? 'Yes' : 'No'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Total Partitions:</span>
              <span className="detail-value">{metrics.totalPartitions}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Avg Partition Time:</span>
              <span className="detail-value">{metrics.avgPartitionTime.toFixed(2)} ms</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Chunk Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Total Chunks:</span>
              <span className="detail-value">{metrics.totalChunks}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Avg Chunk Time:</span>
              <span className="detail-value">{metrics.avgChunkTime.toFixed(2)} ms</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Items per Chunk:</span>
              <span className="detail-value">{metrics.itemsPerChunk.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {config?.enableResourceValidation && resourceValidation && (
        <div className="resource-impact-section">
          <h3>⚠️ Resource Contention Analysis</h3>
          {(() => {
            const partitionWorkers = usePartitioner ? config.parallelPartitions : 1;
            const ioThreadsNeeded = partitionWorkers * 2;
            const workerThreadsNeeded = partitionWorkers * config.asyncPoolSize;
            
            const ioThreadsAvailable = config.ioThreads;
            const workerThreadsAvailable = config.workerThreads;
            
            const ioContention = ioThreadsNeeded > ioThreadsAvailable;
            const workerContention = workerThreadsNeeded > workerThreadsAvailable;
            
            // Calculate waiting time due to thread contention
            const ioWaitMultiplier = ioContention ? Math.ceil(ioThreadsNeeded / ioThreadsAvailable) : 1;
            const workerWaitMultiplier = workerContention ? Math.ceil(workerThreadsNeeded / workerThreadsAvailable) : 1;
            
            const idealTime = totalTime;
            const ioWaitTime = ioContention ? idealTime * (ioWaitMultiplier - 1) * 0.3 : 0; // 30% impact from IO wait
            const workerWaitTime = workerContention ? idealTime * (workerWaitMultiplier - 1) * 0.7 : 0; // 70% impact from worker wait
            const estimatedActualTime = idealTime + ioWaitTime + workerWaitTime;
            
            const hasContention = ioContention || workerContention;
            
            return (
              <div className="contention-analysis">
                {!hasContention ? (
                  <div className="no-contention">
                    <span className="status-icon">✅</span>
                    <span>No resource contention detected. Configuration is within POD limits.</span>
                  </div>
                ) : (
                  <>
                    <div className="contention-warning">
                      <span className="status-icon">⚠️</span>
                      <span>Resource contention detected! Job will experience delays due to thread waiting.</span>
                    </div>
                    
                    <div className="contention-grid">
                      <div className={`contention-card ${ioContention ? 'has-contention' : 'no-issue'}`}>
                        <div className="contention-header">
                          <span className="contention-icon">📥</span>
                          <span>IO Threads</span>
                        </div>
                        <div className="contention-details">
                          <div className="contention-row">
                            <span>Needed:</span>
                            <span className="contention-value">{ioThreadsNeeded}</span>
                          </div>
                          <div className="contention-row">
                            <span>Available:</span>
                            <span className="contention-value">{ioThreadsAvailable}</span>
                          </div>
                          {ioContention && (
                            <>
                              <div className="contention-row warning">
                                <span>Wait Cycles:</span>
                                <span className="contention-value">{ioWaitMultiplier}x</span>
                              </div>
                              <div className="contention-row warning">
                                <span>Est. Wait Time:</span>
                                <span className="contention-value">{ioWaitTime.toFixed(2)}ms</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className={`contention-card ${workerContention ? 'has-contention' : 'no-issue'}`}>
                        <div className="contention-header">
                          <span className="contention-icon">⚙️</span>
                          <span>Worker Threads</span>
                        </div>
                        <div className="contention-details">
                          <div className="contention-row">
                            <span>Needed:</span>
                            <span className="contention-value">{workerThreadsNeeded}</span>
                          </div>
                          <div className="contention-row">
                            <span>Available:</span>
                            <span className="contention-value">{workerThreadsAvailable}</span>
                          </div>
                          {workerContention && (
                            <>
                              <div className="contention-row warning">
                                <span>Wait Cycles:</span>
                                <span className="contention-value">{workerWaitMultiplier}x</span>
                              </div>
                              <div className="contention-row warning">
                                <span>Est. Wait Time:</span>
                                <span className="contention-value">{workerWaitTime.toFixed(2)}ms</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="time-comparison">
                      <div className="time-card ideal">
                        <div className="time-label">Ideal Time (No Contention)</div>
                        <div className="time-value">{idealTime.toFixed(2)}ms</div>
                      </div>
                      <div className="time-arrow">→</div>
                      <div className="time-card actual">
                        <div className="time-label">Estimated Actual Time</div>
                        <div className="time-value">{estimatedActualTime.toFixed(2)}ms</div>
                      </div>
                      <div className="time-card overhead">
                        <div className="time-label">Overhead</div>
                        <div className="time-value">+{((estimatedActualTime - idealTime) / idealTime * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className="partition-breakdown">
        <h3>Partition Breakdown</h3>
        <div className="partition-table-container">
          <div className="partition-table">
            <div className="table-header">
              <div>Partition</div>
              <div>Items</div>
              <div>Chunks</div>
              <div>Start Time</div>
              <div>End Time</div>
              <div>Duration</div>
              <div>Throughput</div>
            </div>
            {partitions.map((partition, idx) => {
              const duration = partition.endTime - partition.startTime;
              const throughput = (partition.itemCount / duration) * 1000;
              return (
                <div key={idx} className="table-row">
                  <div>{partition.stepName}</div>
                  <div>{partition.itemCount}</div>
                  <div>{partition.chunks.length}</div>
                  <div>{partition.startTime.toFixed(2)}ms</div>
                  <div>{partition.endTime.toFixed(2)}ms</div>
                  <div>{duration.toFixed(2)}ms</div>
                  <div>{throughput.toFixed(2)} items/sec</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
