import React, { useState } from 'react';
import './App.css';
import { SpringBatchSimulator } from './components/SpringBatchSimulator';
import TimelineVisualization from './components/TimelineVisualization';
import PerformanceMetrics from './components/PerformanceMetrics';
import ResourceValidation from './components/ResourceValidation';

function App() {
  const [config, setConfig] = useState({
    totalItems: 1000,
    usePartitioner: false,
    gridSize: 250,
    parallelPartitions: 2,
    chunkSize: 100,
    asyncPoolSize: 10,
    readTime: 1,
    processTime: 2,
    writeTime: 1,
    enableResourceValidation: false,
    podCores: 4,
    ioThreads: 8,  // cores * 2 for IO operations (reader/writer)
    workerThreads: 16,  // cores * 4 for CPU-bound operations (processor)
    hikariPoolSize: 10,
    hikariMaxPoolSize: 20
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
            <h3>Basic Configuration</h3>
            <div className="form-group">
              <label htmlFor="totalItems">
                Total Items
                <span className="info-icon" data-tooltip="Total number of records to process in the batch job. Impact: Higher values increase job duration and resource usage. Use this to simulate your actual data volume.">i</span>
              </label>
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
              <label htmlFor="readTime">
                Read Time per Chunk (ms)
                <span className="info-icon" data-tooltip="Time to read one chunk from the data source (DB query, file read, etc.). This is SYNCHRONOUS and SEQUENTIAL within each worker. Impact: Higher values slow down the job. Typical DB query: 5-50ms, File read: 1-10ms.">i</span>
              </label>
              <input
                type="number"
                id="readTime"
                name="readTime"
                value={config.readTime}
                onChange={handleInputChange}
                min="0"
                step="0.1"
              />
              <span className="help-text">Time to read a chunk (synchronous, sequential)</span>
            </div>

            <div className="form-group">
              <label htmlFor="processTime">
                Process Time per Item (ms)
                <span className="info-icon" data-tooltip="Time to process/transform each item using AsyncItemProcessor. This runs in PARALLEL using the async thread pool. Impact: Higher values increase job duration but can be mitigated by increasing async pool size. Typical: 10-100ms for business logic.">i</span>
              </label>
              <input
                type="number"
                id="processTime"
                name="processTime"
                value={config.processTime}
                onChange={handleInputChange}
                min="0"
                step="0.1"
              />
              <span className="help-text">Time to process each item (async, parallel)</span>
            </div>

            <div className="form-group">
              <label htmlFor="writeTime">
                Write Time per Chunk (ms)
                <span className="info-icon" data-tooltip="Time to write processed items using AsyncItemWriter. This runs in PARALLEL with processing. Impact: Higher values can slow down the job. Typical DB batch insert: 10-50ms, API call: 50-200ms.">i</span>
              </label>
              <input
                type="number"
                id="writeTime"
                name="writeTime"
                value={config.writeTime}
                onChange={handleInputChange}
                min="0"
                step="0.1"
              />
              <span className="help-text">Time to write each chunk (async, parallel)</span>
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
                <span className="info-icon" data-tooltip="Enables Spring Batch Partitioner to split the job into multiple partitions that run in parallel. Impact: Dramatically reduces job time by utilizing multiple workers. Essential for large datasets. Recommended for jobs with 10,000+ items.">i</span>
              </label>
            </div>

            {config.usePartitioner && (
              <>
                <div className="form-group">
                  <label htmlFor="gridSize">
                    Grid Size (Items per Partition)
                    <span className="info-icon" data-tooltip="Number of items assigned to each partition. Impact: Smaller grids = more partitions = more parallelism but higher overhead. Larger grids = fewer partitions = less parallelism. Formula: partitions = totalItems / gridSize. Recommended: 1000-10000 items per partition.">i</span>
                  </label>
                  <input
                    type="number"
                    id="gridSize"
                    name="gridSize"
                    value={config.gridSize}
                    onChange={handleInputChange}
                    min="1"
                  />
                  <span className="help-text">Number of items in each partition grid</span>
                </div>

                <div className="form-group">
                  <label htmlFor="parallelPartitions">
                    Parallel Workers (Partitions)
                    <span className="info-icon" data-tooltip="Number of worker threads that process partitions simultaneously. Impact: More workers = faster job BUT requires more CPU cores and threads. Each worker needs 1 thread. Recommended: 2-4x CPU cores. Too many workers can cause thread contention.">i</span>
                  </label>
                  <input
                    type="number"
                    id="parallelPartitions"
                    name="parallelPartitions"
                    value={config.parallelPartitions}
                    onChange={handleInputChange}
                    min="1"
                  />
                  <span className="help-text">Number of worker threads processing partitions in parallel</span>
                </div>
              </>
            )}
          </div>

          <div className="config-section">
            <h3>Chunk Processing Settings</h3>
            <div className="form-group">
              <label htmlFor="chunkSize">
                Chunk Size
                <span className="info-icon" data-tooltip="Number of items processed in each chunk (read-process-write cycle). Impact: Smaller chunks = more frequent commits = safer but slower. Larger chunks = fewer commits = faster but riskier. Recommended: 100-1000 items. Affects transaction size and memory usage.">i</span>
              </label>
              <input
                type="number"
                id="chunkSize"
                name="chunkSize"
                value={config.chunkSize}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Number of items per chunk (read synchronously)</span>
            </div>

            <div className="form-group">
              <label htmlFor="asyncPoolSize">
                Async Pool Size
                <span className="info-icon" data-tooltip="Thread pool size for AsyncItemProcessor and AsyncItemWriter. Impact: Higher values = more parallel processing/writing = faster BUT requires more threads and DB connections. Total threads = workers + (workers × asyncPoolSize). Recommended: 5-20. Balance with DB connection pool.">i</span>
              </label>
              <input
                type="number"
                id="asyncPoolSize"
                name="asyncPoolSize"
                value={config.asyncPoolSize}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Thread pool size for AsyncItemProcessor and AsyncItemWriter</span>
            </div>
          </div>

          <div className="config-section">
            <h3>Infrastructure Settings</h3>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="enableResourceValidation"
                  checked={config.enableResourceValidation}
                  onChange={handleInputChange}
                />
                <span>Enable Resource Validation</span>
                <span className="info-icon" data-tooltip="Validates your job configuration against infrastructure limits (CPU cores, threads, DB connections). Impact: Shows warnings if configuration exceeds available resources. Helps prevent job failures due to resource exhaustion. Recommended: Always enabled.">i</span>
              </label>
              <span className="help-text" style={{ marginLeft: '30px', display: 'block', marginTop: '5px' }}>Validate job configuration against POD and DB infrastructure limits</span>
            </div>

            {config.enableResourceValidation && (
              <>
            <div className="form-group">
              <label htmlFor="podCores">
                POD CPU Cores
                <span className="info-icon" data-tooltip="Number of CPU cores available in your POD/container. This determines the baseline for IO and Worker thread calculations. Typical: 2-8 cores for batch jobs.">i</span>
              </label>
              <input
                type="number"
                id="podCores"
                name="podCores"
                value={config.podCores}
                onChange={(e) => {
                  const cores = Number(e.target.value);
                  setConfig(prev => ({
                    ...prev,
                    podCores: cores,
                    ioThreads: cores * 2,
                    workerThreads: cores * 4
                  }));
                }}
                min="1"
              />
              <span className="help-text">Number of CPU cores available in the POD</span>
            </div>

            <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#374151', fontSize: '16px' }}>Thread Pool Configuration</h4>
            
            <div className="form-group">
              <label htmlFor="ioThreads">
                IO Threads (Reader/Writer)
                <span className="info-icon" data-tooltip="Threads for IO-bound operations like reading from DB/files and writing to DB/files. Formula: cores × 2. These threads handle synchronous readers and async writers. Recommended: Don't exceed cores × 3.">i</span>
              </label>
              <input
                type="number"
                id="ioThreads"
                name="ioThreads"
                value={config.ioThreads}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Threads for IO operations (default: cores × 2)</span>
            </div>

            <div className="form-group">
              <label htmlFor="workerThreads">
                Worker Threads (Processor)
                <span className="info-icon" data-tooltip="Threads for CPU-bound operations like business logic processing. Formula: cores × 4. These threads handle AsyncItemProcessor tasks. Recommended: cores × 2 to cores × 8 depending on workload.">i</span>
              </label>
              <input
                type="number"
                id="workerThreads"
                name="workerThreads"
                value={config.workerThreads}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Threads for CPU processing (default: cores × 4)</span>
            </div>

            <div className="form-group">
              <label htmlFor="hikariPoolSize">Hikari Min Pool Size</label>
              <input
                type="number"
                id="hikariPoolSize"
                name="hikariPoolSize"
                value={config.hikariPoolSize}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Minimum DB connections in Hikari pool</span>
            </div>

            <div className="form-group">
              <label htmlFor="hikariMaxPoolSize">Hikari Max Pool Size</label>
              <input
                type="number"
                id="hikariMaxPoolSize"
                name="hikariMaxPoolSize"
                value={config.hikariMaxPoolSize}
                onChange={handleInputChange}
                min="1"
              />
              <span className="help-text">Maximum DB connections in Hikari pool</span>
            </div>
              </>
            )}
          </div>

          <button className="simulate-button" onClick={runSimulation}>
            ▶️ Run Simulation
          </button>
        </div>

        {simulationResult && (
          <div className="results-panel">
            <ResourceValidation validation={simulationResult.resourceValidation} />
            <PerformanceMetrics simulationResult={simulationResult} config={config} />
            <TimelineVisualization simulationResult={simulationResult} config={config} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
