import React, { useState } from 'react';
import './App.css';
import { SpringBatchSimulator } from './components/SpringBatchSimulator';
import TimelineVisualization from './components/TimelineVisualization';
import PerformanceMetrics from './components/PerformanceMetrics';

function App() {
  const [config, setConfig] = useState({
    totalItems: 1000,
    usePartitioner: false,
    gridSize: 4,
    parallelPartitions: 2,
    chunkSize: 100,
    parallelProcessors: 1,
    readTime: 1,
    processTime: 2
  });

  const [simulationResult, setSimulationResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  const runSimulation = () => {
    const simulator = new SpringBatchSimulator(config);
    const result = simulator.simulate();
    setSimulationResult(result);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🚀 Spring Batch Performance Visualizer</h1>
        <p>Simulate and analyze Spring Batch job execution with partitioning and parallel processing</p>
      </header>

      <div className="app-container">
        <div className="config-panel">
          <h2>Job Configuration</h2>
          
          <div className="config-section">
            <h3>Basic Settings</h3>
            <div className="form-group">
              <label htmlFor="totalItems">Total Items</label>
              <input
                type="number"
                id="totalItems"
                name="totalItems"
                value={config.totalItems}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Total number of items to process</span>
            </div>

            <div className="form-group">
              <label htmlFor="readTime">Read Time (ms per item)</label>
              <input
                type="number"
                id="readTime"
                name="readTime"
                value={config.readTime}
                onChange={handleInputChange}
                min="0"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="processTime">Process Time (ms per item)</label>
              <input
                type="number"
                id="processTime"
                name="processTime"
                value={config.processTime}
                onChange={handleInputChange}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="config-section">
            <h3>Partitioner Settings</h3>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="usePartitioner"
                  checked={config.usePartitioner}
                  onChange={handleInputChange}
                />
                <span>Enable Partitioner</span>
              </label>
            </div>

            {config.usePartitioner && (
              <>
                <div className="form-group">
                  <label htmlFor="gridSize">Grid Size</label>
                  <input
                    type="number"
                    id="gridSize"
                    name="gridSize"
                    value={config.gridSize}
                    onChange={handleInputChange}
                    min="1"
                  />
                  <span className="help-text">Number of partitions to create</span>
                </div>

                <div className="form-group">
                  <label htmlFor="parallelPartitions">Parallel Partitions</label>
                  <input
                    type="number"
                    id="parallelPartitions"
                    name="parallelPartitions"
                    value={config.parallelPartitions}
                    onChange={handleInputChange}
                    min="1"
                    max={config.gridSize}
                  />
                  <span className="help-text">Number of partitions to run in parallel</span>
                </div>
              </>
            )}
          </div>

          <div className="config-section">
            <h3>Step Processing Settings</h3>
            <div className="form-group">
              <label htmlFor="chunkSize">Chunk Size</label>
              <input
                type="number"
                id="chunkSize"
                name="chunkSize"
                value={config.chunkSize}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Number of items per chunk</span>
            </div>

            <div className="form-group">
              <label htmlFor="parallelProcessors">Parallel Processors</label>
              <input
                type="number"
                id="parallelProcessors"
                name="parallelProcessors"
                value={config.parallelProcessors}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Number of chunks to process in parallel</span>
            </div>
          </div>

          <button className="simulate-button" onClick={runSimulation}>
            ▶️ Run Simulation
          </button>
        </div>

        {simulationResult && (
          <div className="results-panel">
            <PerformanceMetrics simulationResult={simulationResult} />
            <TimelineVisualization simulationResult={simulationResult} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
