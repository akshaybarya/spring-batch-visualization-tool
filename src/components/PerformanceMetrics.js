import React from 'react';
import './PerformanceMetrics.css';

const PerformanceMetrics = ({ simulationResult }) => {
  if (!simulationResult) return null;

  const { totalTime, totalItems, partitions, usePartitioner } = simulationResult;

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

  return (
    <div className="performance-metrics">
      <h2>Performance Metrics</h2>
      
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

      <div className="partition-breakdown">
        <h3>Partition Breakdown</h3>
        <div className="partition-table">
          <div className="table-header">
            <div>Partition</div>
            <div>Items</div>
            <div>Chunks</div>
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
                <div>{duration.toFixed(2)} ms</div>
                <div>{throughput.toFixed(2)} items/sec</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
