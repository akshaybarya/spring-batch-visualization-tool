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
2. **Grid Size**: Number of items per partition (partitions are created dynamically based on total items)
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
