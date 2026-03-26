export class SpringBatchSimulator {
  constructor(config) {
    this.totalItems = config.totalItems;
    this.usePartitioner = config.usePartitioner;
    this.gridSize = config.gridSize;
    this.parallelPartitions = config.parallelPartitions;
    this.chunkSize = config.chunkSize;
    this.asyncPoolSize = config.asyncPoolSize || 10;
    this.readTime = config.readTime;
    this.processTime = config.processTime;
    this.writeTime = config.writeTime || 1;
    this.enableResourceValidation = config.enableResourceValidation;
    this.podCores = config.podCores;
    this.ioThreads = config.ioThreads;
    this.workerThreads = config.workerThreads;
    this.hikariPoolSize = config.hikariPoolSize;
    this.hikariMaxPoolSize = config.hikariMaxPoolSize;
  }

  simulate() {
    const timeline = [];
    let currentTime = 0;
    
    let result;
    if (this.usePartitioner) {
      result = this.simulateWithPartitioner(timeline, currentTime);
    } else {
      result = this.simulateWithoutPartitioner(timeline, currentTime);
    }
    
    if (this.enableResourceValidation) {
      result.resourceValidation = this.validateResources();
    } else {
      result.resourceValidation = null;
    }
    
    return result;
  }

  validateResources() {
    const warnings = [];
    const suggestions = [];
    
    // Partition workers = parallel partitions (each partition runs in its own thread)
    const partitionWorkers = this.usePartitioner ? this.parallelPartitions : 1;
    
    // IO thread usage: Each partition worker uses IO threads for reading and writing
    // Reader: synchronous, 1 thread per worker (reads chunk at a time)
    // Writer: 1 thread per worker (writes entire chunk in one batch operation)
    const ioThreadsForReading = partitionWorkers; // 1 reader thread per worker
    const ioThreadsForWriting = partitionWorkers; // 1 writer thread per worker (batch write)
    const totalIOThreadsUsed = ioThreadsForReading + ioThreadsForWriting;
    
    // Worker thread usage: AsyncItemProcessor uses worker threads for CPU-bound processing
    // Each item in a chunk can be processed in parallel using the async pool
    const workerThreadsForProcessing = partitionWorkers * this.asyncPoolSize;
    
    // Total threads = partition workers + async threads (for processing and writing)
    const maxConcurrentThreads = partitionWorkers + (partitionWorkers * this.asyncPoolSize);
    
    // DB connections needed = async threads (each async processor/writer may need a connection)
    const maxConcurrentDbConnections = totalIOThreadsUsed;
    
    // Check IO thread usage
    const ioThreadUtilization = (totalIOThreadsUsed / this.ioThreads) * 100;
    if (totalIOThreadsUsed > this.ioThreads) {
      warnings.push({
        type: 'io-threads',
        severity: 'high',
        message: `IO thread usage (${totalIOThreadsUsed}) exceeds available IO threads (${this.ioThreads})`,
        impact: 'Reader/Writer operations will be blocked, causing severe slowdowns',
        recommendation: `Reduce parallel workers to ${Math.floor(this.ioThreads / (this.asyncPoolSize + 1))} or reduce async pool size to ${Math.floor((this.ioThreads - partitionWorkers) / partitionWorkers)}`
      });
    } else if (ioThreadUtilization > 90) {
      warnings.push({
        type: 'io-threads',
        severity: 'medium',
        message: `IO thread utilization is ${ioThreadUtilization.toFixed(1)}% (${totalIOThreadsUsed}/${this.ioThreads})`,
        impact: 'IO operations may experience contention',
        recommendation: `Consider increasing IO threads to ${totalIOThreadsUsed + 2} or reducing async pool size`
      });
    } else if (ioThreadUtilization < 30) {
      suggestions.push(`IO threads are underutilized (${ioThreadUtilization.toFixed(1)}%). System can handle more parallel workers or larger async pool.`);
    }
    
    // Check Worker thread usage
    const workerThreadUtilization = (workerThreadsForProcessing / this.workerThreads) * 100;
    if (workerThreadsForProcessing > this.workerThreads) {
      warnings.push({
        type: 'worker-threads',
        severity: 'high',
        message: `Worker thread usage (${workerThreadsForProcessing}) exceeds available worker threads (${this.workerThreads})`,
        impact: 'Processing operations will be queued, causing severe performance degradation',
        recommendation: `Reduce async pool size to ${Math.floor(this.workerThreads / partitionWorkers)} or reduce parallel workers`
      });
    } else if (workerThreadUtilization > 90) {
      warnings.push({
        type: 'worker-threads',
        severity: 'medium',
        message: `Worker thread utilization is ${workerThreadUtilization.toFixed(1)}% (${workerThreadsForProcessing}/${this.workerThreads})`,
        impact: 'CPU-bound processing may experience contention',
        recommendation: `Consider increasing worker threads to ${workerThreadsForProcessing + 4} or reducing async pool size`
      });
    } else if (workerThreadUtilization < 30) {
      suggestions.push(`Worker threads are underutilized (${workerThreadUtilization.toFixed(1)}%). Can increase async pool size to ${Math.floor(this.workerThreads / partitionWorkers)} for better CPU utilization.`);
    }
    
    // Check DB connections
    if (maxConcurrentDbConnections > this.hikariMaxPoolSize) {
      warnings.push({
        type: 'db_pool_overflow',
        severity: 'error',
        message: `Configuration requires ${maxConcurrentDbConnections} DB connections but Hikari max pool size is only ${this.hikariMaxPoolSize}`,
        impact: 'Database connection pool exhaustion will cause blocking and performance degradation',
        recommendation: `Increase Hikari max pool size to at least ${maxConcurrentDbConnections} or reduce parallelism`
      });
    }
    
    // Check DB utilization
    const dbUtilization = (maxConcurrentDbConnections / this.hikariMaxPoolSize) * 100;
    if (dbUtilization < 30 && maxConcurrentDbConnections < this.hikariMaxPoolSize) {
      suggestions.push(`DB connections are underutilized (${dbUtilization.toFixed(1)}%). Can increase parallelism to utilize more connections (up to ${this.hikariMaxPoolSize}).`);
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions,
      resourceUsage: {
        ioThreads: {
          required: totalIOThreadsUsed,
          available: this.ioThreads,
          utilization: ioThreadUtilization,
          breakdown: {
            reading: ioThreadsForReading,
            writing: ioThreadsForWriting
          }
        },
        workerThreads: {
          required: workerThreadsForProcessing,
          available: this.workerThreads,
          utilization: workerThreadUtilization,
          breakdown: {
            processing: workerThreadsForProcessing
          }
        },
        totalThreads: {
          required: maxConcurrentThreads,
          available: this.ioThreads + this.workerThreads,
          utilization: (maxConcurrentThreads / (this.ioThreads + this.workerThreads)) * 100
        },
        dbConnections: {
          required: totalIOThreadsUsed,
          available: this.hikariMaxPoolSize,
          utilization: (totalIOThreadsUsed / this.hikariMaxPoolSize) * 100
        },
        cpuCores: {
          available: this.podCores,
          optimalIOThreads: this.podCores * 2,
          optimalWorkerThreads: this.podCores * 4
        }
      }
    };
  }

  simulateWithPartitioner(timeline, startTime) {
    const itemsPerPartition = this.gridSize;
    const numberOfPartitions = Math.ceil(this.totalItems / itemsPerPartition);
    const partitions = [];
    
    for (let i = 0; i < numberOfPartitions; i++) {
      const startItem = i * itemsPerPartition;
      const endItem = Math.min(startItem + itemsPerPartition, this.totalItems);
      const itemCount = endItem - startItem;
      
      if (itemCount > 0) {
        partitions.push({
          id: i,
          startItem,
          endItem,
          itemCount
        });
      }
    }

    timeline.push({
      type: 'job-start',
      time: startTime,
      description: `Job started with ${this.totalItems} items`
    });

    timeline.push({
      type: 'partitioner',
      time: startTime,
      description: `Partitioner created ${partitions.length} partitions (grid size: ${this.gridSize})`
    });

    const partitionResults = [];
    const activePartitions = Math.min(this.parallelPartitions, partitions.length);
    
    let partitionIndex = 0;
    let maxEndTime = startTime;
    const runningPartitions = [];

    while (partitionIndex < partitions.length || runningPartitions.length > 0) {
      while (runningPartitions.length < activePartitions && partitionIndex < partitions.length) {
        const partition = partitions[partitionIndex];
        const partitionStartTime = maxEndTime;
        
        const stepResult = this.simulateStep(
          partition.itemCount,
          partitionStartTime,
          `Partition ${partition.id}`,
          timeline
        );
        
        runningPartitions.push({
          partition,
          result: stepResult,
          startTime: partitionStartTime
        });
        
        partitionIndex++;
      }

      if (runningPartitions.length > 0) {
        runningPartitions.sort((a, b) => a.result.endTime - b.result.endTime);
        const completed = runningPartitions.shift();
        partitionResults.push(completed.result);
        maxEndTime = Math.max(maxEndTime, completed.result.endTime);
      }
    }

    const jobEndTime = Math.max(...partitionResults.map(r => r.endTime));
    
    timeline.push({
      type: 'job-end',
      time: jobEndTime,
      description: `Job completed. Total time: ${jobEndTime.toFixed(2)}ms`
    });

    return {
      timeline,
      totalTime: jobEndTime,
      totalItems: this.totalItems,
      partitions: partitionResults,
      usePartitioner: true
    };
  }

  simulateWithoutPartitioner(timeline, startTime) {
    timeline.push({
      type: 'job-start',
      time: startTime,
      description: `Job started with ${this.totalItems} items`
    });

    const stepResult = this.simulateStep(
      this.totalItems,
      startTime,
      'Main Step',
      timeline
    );

    timeline.push({
      type: 'job-end',
      time: stepResult.endTime,
      description: `Job completed. Total time: ${stepResult.endTime.toFixed(2)}ms`
    });

    return {
      timeline,
      totalTime: stepResult.endTime,
      totalItems: this.totalItems,
      partitions: [stepResult],
      usePartitioner: false
    };
  }

  simulateStep(itemCount, startTime, stepName, timeline) {
    timeline.push({
      type: 'step-start',
      time: startTime,
      stepName,
      description: `${stepName} started with ${itemCount} items (Worker thread with sync reader, async processor/writer)`
    });

    const chunks = [];
    const numChunks = Math.ceil(itemCount / this.chunkSize);
    
    for (let i = 0; i < numChunks; i++) {
      const chunkStart = i * this.chunkSize;
      const chunkEnd = Math.min(chunkStart + this.chunkSize, itemCount);
      const chunkItemCount = chunkEnd - chunkStart;
      
      chunks.push({
        id: i,
        itemCount: chunkItemCount,
        startItem: chunkStart,
        endItem: chunkEnd
      });
    }

    // Process chunks sequentially (synchronous reader)
    const chunkResults = [];
    let currentTime = startTime;

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkStartTime = currentTime;
      
      // Synchronous read (thread-safe, sequential) - read time is per chunk, not per item
      const readTime = this.readTime;
      
      timeline.push({
        type: 'chunk-start',
        time: chunkStartTime,
        stepName,
        chunkId: chunk.id,
        description: `${stepName} - Chunk ${chunk.id} started (${chunk.itemCount} items)`
      });

      timeline.push({
        type: 'chunk-read',
        time: chunkStartTime,
        stepName,
        chunkId: chunk.id,
        duration: readTime,
        description: `[SYNC] Reading ${chunk.itemCount} items sequentially (${readTime.toFixed(2)}ms)`
      });

      const readEndTime = chunkStartTime + readTime;
      
      // Async processing and writing (parallel execution with async pool)
      const asyncItems = [];
      const itemsPerAsyncTask = Math.ceil(chunk.itemCount / this.asyncPoolSize);
      
      for (let i = 0; i < chunk.itemCount; i += itemsPerAsyncTask) {
        const asyncItemCount = Math.min(itemsPerAsyncTask, chunk.itemCount - i);
        asyncItems.push({
          id: Math.floor(i / itemsPerAsyncTask),
          itemCount: asyncItemCount,
          processTime: asyncItemCount * this.processTime,
          writeTime: this.writeTime
        });
      }
      
      // Async tasks run in parallel (limited by async pool size)
      const maxAsyncTime = Math.max(...asyncItems.map(item => item.processTime + item.writeTime));
      
      timeline.push({
        type: 'chunk-process',
        time: readEndTime,
        stepName,
        chunkId: chunk.id,
        duration: maxAsyncTime,
        description: `[ASYNC] Processing ${chunk.itemCount} items with ${asyncItems.length} async tasks (pool size: ${this.asyncPoolSize}) (${maxAsyncTime.toFixed(2)}ms)`
      });

      timeline.push({
        type: 'chunk-write',
        time: readEndTime,
        stepName,
        chunkId: chunk.id,
        duration: maxAsyncTime,
        description: `[ASYNC] Writing items in parallel (${maxAsyncTime.toFixed(2)}ms)`
      });

      const chunkEndTime = readEndTime + maxAsyncTime;
      
      timeline.push({
        type: 'chunk-end',
        time: chunkEndTime,
        stepName,
        chunkId: chunk.id,
        description: `${stepName} - Chunk ${chunk.id} completed`
      });

      chunkResults.push({
        chunk,
        startTime: chunkStartTime,
        endTime: chunkEndTime
      });
      
      currentTime = chunkEndTime;
    }

    const stepEndTime = currentTime;

    timeline.push({
      type: 'step-end',
      time: stepEndTime,
      stepName,
      description: `${stepName} completed. Duration: ${(stepEndTime - startTime).toFixed(2)}ms`
    });

    return {
      stepName,
      startTime,
      endTime: stepEndTime,
      itemCount,
      chunks: chunkResults
    };
  }
}
