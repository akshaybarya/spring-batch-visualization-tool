# 🚀 Spring Batch Performance Visualizer

An interactive web application to simulate and visualize Spring Batch job execution with partitioning and parallel processing capabilities.

## Features

- **Job Configuration**: Configure total items, read/process times
- **Partitioner Support**: Enable partitioning with configurable grid size and parallel partitions
- **Parallel Processing**: Configure chunk size and number of parallel processors
- **Timeline Visualization**: Visual representation of job execution with step and chunk details
- **Performance Metrics**: Comprehensive metrics including throughput, efficiency, and execution times
- **Event Log**: Detailed log of all job events with timestamps

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Running the Application

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## How to Use

### Basic Configuration

1. **Total Items**: Set the total number of items to process
2. **Read Time**: Time (in ms) to read each item
3. **Process Time**: Time (in ms) to process each item

### Partitioner Settings

1. **Enable Partitioner**: Toggle to enable/disable partitioning
2. **Grid Size**: Number of partitions to create
3. **Parallel Partitions**: Number of partitions to run simultaneously

### Step Processing Settings

1. **Chunk Size**: Number of items per chunk
2. **Parallel Processors**: Number of chunks to process in parallel

### Running Simulation

Click the **Run Simulation** button to execute the simulation and view results.

## Understanding the Results

### Performance Metrics

- **Total Execution Time**: Overall time to complete the job
- **Throughput**: Items processed per second
- **Total Items Processed**: Total number of items
- **Parallelization Efficiency**: How effectively parallel processing is utilized

### Timeline Visualization

Shows a visual timeline of:
- Step execution bars (blue)
- Chunk processing bars (orange)
- Time markers for reference

### Event Log

Detailed chronological log of all events including:
- Job start/end
- Partitioner creation
- Step start/end
- Chunk read/process/write operations

## Example Scenarios

### Scenario 1: Simple Job (No Partitioning)
- Total Items: 1000
- Chunk Size: 100
- Parallel Processors: 1
- Read Time: 1ms
- Process Time: 2ms

### Scenario 2: Partitioned Job
- Total Items: 10000
- Enable Partitioner: Yes
- Grid Size: 4
- Parallel Partitions: 2
- Chunk Size: 100
- Parallel Processors: 2
- Read Time: 1ms
- Process Time: 2ms

## Technologies Used

- React 19
- CSS3 (Custom styling)
- Create React App

## Project Structure

```
src/
├── components/
│   ├── SpringBatchSimulator.js    # Core simulation engine
│   ├── TimelineVisualization.js   # Timeline component
│   ├── TimelineVisualization.css
│   ├── PerformanceMetrics.js      # Metrics display
│   └── PerformanceMetrics.css
├── App.js                          # Main application component
├── App.css                         # Main styles
└── index.js                        # Entry point
```

## License

MIT
