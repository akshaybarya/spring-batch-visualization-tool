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

## Spring Batch Architecture

This visualizer models a realistic Spring Batch architecture:

### Architecture Overview

```
Job
 └─ Partitioner (optional)
     └─ Creates N partitions (grids) based on total items / grid size
         └─ Each partition runs in a Worker Thread
             └─ Worker processes chunks sequentially
                 ├─ ItemReader (Synchronous, Thread-Safe)
                 │   └─ Reads items one by one from DB/file
                 ├─ AsyncItemProcessor (Parallel, Async Pool)
                 │   └─ Processes items in parallel using thread pool
                 └─ AsyncItemWriter (Parallel, Async Pool)
                     └─ Writes items in parallel using thread pool
```

### Key Concepts

**1. Partitioner**
- Splits the total workload into multiple partitions (grids)
- Each partition contains `gridSize` items
- Number of partitions = `ceil(totalItems / gridSize)`

**2. Worker Threads**
- Each partition runs in its own worker thread
- `parallelPartitions` determines how many partitions run concurrently
- Workers process chunks sequentially within their partition

**3. Synchronous Reader**
- Most ItemReaders are NOT thread-safe (JdbcCursorItemReader, FlatFileItemReader, etc.)
- Reader must be synchronous and sequential within each worker
- Each chunk reads items one by one

**4. Async Processor & Writer**
- `AsyncItemProcessor` wraps your ItemProcessor with a thread pool
- `AsyncItemWriter` wraps your ItemWriter with a thread pool
- Items within a chunk are processed/written in parallel
- `asyncPoolSize` determines the thread pool size for async operations

### Thread Model

**Total Threads Required:**
```
Total Threads = Worker Threads + Async Threads
Worker Threads = parallelPartitions (or 1 if no partitioner)
Async Threads = Worker Threads × asyncPoolSize
```

**Example:**
- 4 parallel partitions
- 10 async pool size
- Total threads = 4 + (4 × 10) = 44 threads

## How to Use

### Basic Configuration

1. **Total Items**: Total number of items to process
2. **Read Time per Item**: Time to read each item (synchronous, sequential)
3. **Process Time per Item**: Time to process each item (async, parallel)
4. **Write Time per Chunk**: Time to write each chunk (async, parallel)

### Partitioner Settings

1. **Enable Partitioner**: Toggle to enable/disable partitioning
2. **Grid Size**: Number of items per partition (partitions created dynamically)
3. **Parallel Workers**: Number of worker threads processing partitions in parallel

### Chunk Processing Settings

1. **Chunk Size**: Number of items per chunk (read synchronously)
2. **Async Pool Size**: Thread pool size for AsyncItemProcessor and AsyncItemWriter

### Infrastructure Settings (Optional)

1. **Enable Resource Validation**: Toggle to validate against infrastructure limits
2. **POD CPU Cores**: Number of CPU cores available
3. **POD Max Threads**: Maximum threads available (default: 4 × cores)
4. **Hikari Min/Max Pool Size**: Database connection pool settings

### Running Simulation

Click the **Run Simulation** button to execute the simulation and view results.

## Performance Tuning Guide

### 1. Choosing Grid Size (Partition Size)

**Goal:** Balance partition overhead with parallelism benefits

**Guidelines:**
- **Too small** (< 100 items): High overhead from partition creation
- **Too large** (> 10,000 items): Reduces parallelism benefits
- **Recommended**: 1,000 - 5,000 items per partition
- Formula: `gridSize = totalItems / (2 × podCores)`

**Example:**
- 100,000 items, 4 cores
- Grid size = 100,000 / (2 × 4) = 12,500 items
- Creates 8 partitions

### 2. Tuning Parallel Workers

**Goal:** Maximize CPU utilization without oversubscription

**Guidelines:**
- Start with: `parallelPartitions = podCores`
- Maximum: `podCores × 2` (to account for I/O wait)
- Monitor: Thread utilization should be 70-90%

**Constraints:**
- Each worker needs 1 thread + async pool threads
- Total threads = workers + (workers × asyncPoolSize)
- Must not exceed `podThreads`

**Example:**
- 4 cores, 16 max threads, async pool = 2
- Max workers = 16 / (1 + 2) = 5 workers
- But optimal = 4 workers (1 per core)

### 3. Tuning Chunk Size

**Goal:** Balance transaction size with memory usage

**Guidelines:**
- **Too small** (< 10): High transaction overhead
- **Too large** (> 1,000): High memory usage, long transactions
- **Recommended**: 50 - 500 items per chunk
- **Database-heavy**: 50 - 100 (smaller transactions)
- **CPU-heavy**: 200 - 500 (reduce overhead)

**Considerations:**
- Chunk size affects commit frequency
- Smaller chunks = more frequent commits = better progress tracking
- Larger chunks = fewer commits = better performance

### 4. Tuning Async Pool Size

**Goal:** Maximize processing parallelism within each worker

**Guidelines:**
- Start with: `asyncPoolSize = 10`
- **CPU-bound processing**: `asyncPoolSize = 2 × podCores / workers`
- **I/O-bound processing**: `asyncPoolSize = 10 - 20`
- **Database-heavy**: Match with available DB connections

**Constraints:**
- Total async threads = workers × asyncPoolSize
- Each async thread may need a DB connection
- Must not exceed: `hikariMaxPoolSize / workers`

**Example:**
- 4 workers, 20 max DB connections
- Max async pool = 20 / 4 = 5 per worker
- But if I/O-bound, use 10-15 (connections will be shared)

### 5. Database Connection Pool Sizing

**Goal:** Ensure sufficient connections without waste

**Guidelines:**
```
Minimum Required = parallelPartitions × asyncPoolSize
Recommended = Minimum Required × 1.2 (20% buffer)
```

**Example:**
- 4 parallel workers
- 10 async pool size
- Minimum = 4 × 10 = 40 connections
- Recommended = 40 × 1.2 = 48 connections

**Hikari Settings:**
```properties
spring.datasource.hikari.minimum-idle=10
spring.datasource.hikari.maximum-pool-size=50
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
```

### 6. Common Tuning Scenarios

#### Scenario A: CPU-Bound Processing
**Characteristics:** Heavy computation, minimal I/O
```
Grid Size: 2,000
Parallel Workers: 4 (= cores)
Chunk Size: 200
Async Pool Size: 2 (low, CPU-bound)
```

#### Scenario B: I/O-Bound Processing
**Characteristics:** Database queries, API calls, file I/O
```
Grid Size: 5,000
Parallel Workers: 8 (2× cores)
Chunk Size: 100
Async Pool Size: 15 (high, I/O-bound)
```

#### Scenario C: Balanced Workload
**Characteristics:** Mix of CPU and I/O
```
Grid Size: 3,000
Parallel Workers: 6 (1.5× cores)
Chunk Size: 150
Async Pool Size: 10
```

### 7. Monitoring and Optimization

**Key Metrics to Watch:**
1. **Thread Utilization**: Should be 70-90%
2. **DB Connection Utilization**: Should be 60-80%
3. **CPU Utilization**: Should be 70-90%
4. **Throughput**: Items/second
5. **Memory Usage**: Should not exceed 80%

**Optimization Process:**
1. Start with conservative settings
2. Run simulation and check resource utilization
3. If underutilized (< 50%): Increase parallelism
4. If overutilized (> 100%): Decrease parallelism
5. Monitor actual job performance
6. Iterate and fine-tune

### 8. Spring Batch Configuration Example

```java
@Configuration
@EnableBatchProcessing
public class BatchConfig {
    
    @Bean
    public Job partitionedJob(JobBuilderFactory jobs, Step partitionStep) {
        return jobs.get("partitionedJob")
            .start(partitionStep)
            .build();
    }
    
    @Bean
    public Step partitionStep(StepBuilderFactory steps, 
                              Partitioner partitioner,
                              Step workerStep,
                              TaskExecutor taskExecutor) {
        return steps.get("partitionStep")
            .partitioner("workerStep", partitioner)
            .step(workerStep)
            .gridSize(4)  // Number of partitions
            .taskExecutor(taskExecutor)
            .build();
    }
    
    @Bean
    public Step workerStep(StepBuilderFactory steps,
                          ItemReader<MyItem> reader,
                          ItemProcessor<MyItem, MyItem> processor,
                          ItemWriter<MyItem> writer) {
        return steps.get("workerStep")
            .<MyItem, Future<MyItem>>chunk(100)  // Chunk size
            .reader(reader)  // Synchronous reader
            .processor(asyncItemProcessor())  // Async processor
            .writer(asyncItemWriter())  // Async writer
            .build();
    }
    
    @Bean
    public AsyncItemProcessor<MyItem, MyItem> asyncItemProcessor() {
        AsyncItemProcessor<MyItem, MyItem> processor = 
            new AsyncItemProcessor<>();
        processor.setDelegate(itemProcessor());
        processor.setTaskExecutor(asyncTaskExecutor());
        return processor;
    }
    
    @Bean
    public AsyncItemWriter<MyItem> asyncItemWriter() {
        AsyncItemWriter<MyItem> writer = new AsyncItemWriter<>();
        writer.setDelegate(itemWriter());
        return writer;
    }
    
    @Bean
    public TaskExecutor asyncTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);  // Async pool size
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}
```

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
- Grid Size: 2500 (creates 4 partitions of 2500 items each)
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

## Deployment to GitHub Pages

This project is configured for easy deployment to GitHub Pages.

### Prerequisites

1. Create a GitHub repository named `spring-batch-visualization-tool`
2. Ensure you have SSH keys set up for your GitHub account
3. Configure Git to use the correct SSH key (see below)

### 🔑 Using Personal GitHub Account (Multiple Account Setup)

If you have multiple GitHub accounts (e.g., personal and work), you need to ensure Git uses the correct SSH key for this repository.

#### Initial Setup

1. **Configure repository to use personal SSH key**:
   ```bash
   git config core.sshCommand "ssh -i ~/.ssh/your-personal-key -o IdentitiesOnly=yes"
   ```
   Replace `your-personal-key` with your actual SSH key filename (e.g., `akshaybarya`, `id_rsa`, etc.)

2. **Verify SSH authentication**:
   ```bash
   ssh -i ~/.ssh/your-personal-key -T git@github.com
   ```
   You should see: `Hi your-username! You've successfully authenticated...`

#### SSH Config Method (Recommended)

Alternatively, set up SSH config for cleaner commands:

1. Edit `~/.ssh/config`:
   ```
   # Personal GitHub account
   Host github.com-personal
       HostName github.com
       User git
       IdentityFile ~/.ssh/your-personal-key
       IdentitiesOnly yes
   ```

2. Update remote URL:
   ```bash
   git remote set-url origin git@github.com-personal:username/spring-batch-visualization-tool.git
   ```

### 📤 Pushing Code to GitHub

**Option 1: Using environment variable (if you have multiple accounts)**
```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/your-personal-key -o IdentitiesOnly=yes" git push -u origin main
```

**Option 2: Standard push (if SSH config is set up)**
```bash
git push -u origin main
```

### 🚀 Deploy Steps

1. **First-time deployment with personal account**:
   ```bash
   GIT_SSH_COMMAND="ssh -i ~/.ssh/your-personal-key -o IdentitiesOnly=yes" npm run deploy
   ```

   This command will:
   - Build the production version of your app
   - Create a `gh-pages` branch
   - Deploy the build folder to GitHub Pages

2. **Enable GitHub Pages** (First time only):
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Source should be set to `gh-pages` branch (this is done automatically by the deploy script)
   - Your site will be published at: `https://username.github.io/spring-batch-visualization-tool`

3. **Subsequent Deployments**:
   ```bash
   # With personal SSH key
   GIT_SSH_COMMAND="ssh -i ~/.ssh/your-personal-key -o IdentitiesOnly=yes" npm run deploy
   
   # Or if SSH config is set up
   npm run deploy
   ```

### 🔧 Troubleshooting

#### Permission Denied Error

If you see:
```
ERROR: Permission to username/repo.git denied to wrong-account
```

**Solution**: You're using the wrong SSH key. Use the `GIT_SSH_COMMAND` method:
```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/correct-key -o IdentitiesOnly=yes" npm run deploy
```

#### Branch Already Exists Error

If deployment fails with `branch 'gh-pages' already exists`:

```bash
# Clean the gh-pages cache
npx gh-pages-clean

# Or manually remove cache
rm -rf node_modules/.cache

# Then deploy again
GIT_SSH_COMMAND="ssh -i ~/.ssh/your-key -o IdentitiesOnly=yes" npm run deploy
```

### 📝 Quick Reference Commands

```bash
# Check which SSH key Git is using
git config core.sshCommand

# Test SSH connection
ssh -i ~/.ssh/your-key -T git@github.com

# Push code with specific SSH key
GIT_SSH_COMMAND="ssh -i ~/.ssh/your-key -o IdentitiesOnly=yes" git push

# Deploy with specific SSH key
GIT_SSH_COMMAND="ssh -i ~/.ssh/your-key -o IdentitiesOnly=yes" npm run deploy

# Clean gh-pages cache
npx gh-pages-clean
```

### Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Build the project
npm run build

# 2. Deploy to gh-pages branch (with personal SSH key)
GIT_SSH_COMMAND="ssh -i ~/.ssh/your-key -o IdentitiesOnly=yes" npx gh-pages -d build
```

## License

MIT
