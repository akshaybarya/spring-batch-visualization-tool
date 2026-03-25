export class SpringBatchSimulator {
  constructor(config) {
    this.totalItems = config.totalItems;
    this.usePartitioner = config.usePartitioner;
    this.gridSize = config.gridSize;
    this.parallelPartitions = config.parallelPartitions;
    this.chunkSize = config.chunkSize;
    this.parallelProcessors = config.parallelProcessors;
    this.readTime = config.readTime;
    this.processTime = config.processTime;
    this.enableResourceValidation = config.enableResourceValidation;
    this.podCores = config.podCores;
    this.podThreads = config.podThreads;
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
    
    const maxConcurrentThreads = this.usePartitioner 
      ? this.parallelPartitions * this.parallelProcessors
      : this.parallelProcessors;
    
    const maxConcurrentDbConnections = this.usePartitioner
      ? this.parallelPartitions * this.parallelProcessors
      : this.parallelProcessors;
    
    if (maxConcurrentThreads > this.podThreads) {
      warnings.push({
        type: 'thread_overflow',
        severity: 'error',
        message: `Configuration requires ${maxConcurrentThreads} threads but POD only has ${this.podThreads} threads available`,
        impact: 'Job will be throttled and may fail due to thread exhaustion',
        recommendation: `Reduce parallel partitions (${this.parallelPartitions}) or parallel processors (${this.parallelProcessors}), or increase POD threads to at least ${maxConcurrentThreads}`
      });
    }
    
    if (maxConcurrentDbConnections > this.hikariMaxPoolSize) {
      warnings.push({
        type: 'db_pool_overflow',
        severity: 'error',
        message: `Configuration requires ${maxConcurrentDbConnections} DB connections but Hikari max pool size is only ${this.hikariMaxPoolSize}`,
        impact: 'Database connection pool exhaustion will cause blocking and performance degradation',
        recommendation: `Increase Hikari max pool size to at least ${maxConcurrentDbConnections} or reduce parallelism`
      });
    }
    
    const threadUtilization = (maxConcurrentThreads / this.podThreads) * 100;
    if (threadUtilization < 50) {
      suggestions.push({
        type: 'thread_underutilization',
        severity: 'info',
        message: `Thread utilization is only ${threadUtilization.toFixed(1)}% (${maxConcurrentThreads}/${this.podThreads} threads)`,
        impact: 'Resources are underutilized, job could run faster',
        recommendation: `Consider increasing parallel partitions or parallel processors to utilize more threads. You can safely use up to ${this.podThreads} threads.`
      });
    }
    
    const dbUtilization = (maxConcurrentDbConnections / this.hikariMaxPoolSize) * 100;
    if (dbUtilization < 50 && maxConcurrentDbConnections < this.hikariMaxPoolSize) {
      suggestions.push({
        type: 'db_underutilization',
        severity: 'info',
        message: `DB connection utilization is only ${dbUtilization.toFixed(1)}% (${maxConcurrentDbConnections}/${this.hikariMaxPoolSize} connections)`,
        impact: 'Database connection pool is underutilized',
        recommendation: `You can increase parallelism to utilize more DB connections (up to ${this.hikariMaxPoolSize}) for better performance.`
      });
    }
    
    const coreUtilization = (maxConcurrentThreads / (this.podCores * 4)) * 100;
    if (coreUtilization > 100) {
      warnings.push({
        type: 'cpu_oversubscription',
        severity: 'warning',
        message: `Thread count (${maxConcurrentThreads}) exceeds optimal CPU capacity (${this.podCores} cores × 4 = ${this.podCores * 4} threads)`,
        impact: 'CPU oversubscription may lead to context switching overhead and reduced performance',
        recommendation: `Consider reducing parallelism or increasing POD CPU cores. Optimal thread count for Spring Batch is typically 4× CPU cores.`
      });
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions,
      resourceUsage: {
        threads: {
          required: maxConcurrentThreads,
          available: this.podThreads,
          utilization: threadUtilization
        },
        dbConnections: {
          required: maxConcurrentDbConnections,
          available: this.hikariMaxPoolSize,
          utilization: dbUtilization
        },
        cpuCores: {
          available: this.podCores,
          optimalThreads: this.podCores * 4,
          utilization: coreUtilization
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
      description: `${stepName} started with ${itemCount} items`
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

    const chunkResults = [];
    let currentTime = startTime;
    let chunkIndex = 0;
    const runningChunks = [];

    while (chunkIndex < chunks.length || runningChunks.length > 0) {
      while (runningChunks.length < this.parallelProcessors && chunkIndex < chunks.length) {
        const chunk = chunks[chunkIndex];
        const chunkStartTime = currentTime;
        
        const readTime = chunk.itemCount * this.readTime;
        const processTime = chunk.itemCount * this.processTime;
        const writeTime = 1;
        const totalChunkTime = readTime + processTime + writeTime;
        const chunkEndTime = chunkStartTime + totalChunkTime;

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
          description: `Reading ${chunk.itemCount} items (${readTime.toFixed(2)}ms)`
        });

        timeline.push({
          type: 'chunk-process',
          time: chunkStartTime + readTime,
          stepName,
          chunkId: chunk.id,
          duration: processTime,
          description: `Processing ${chunk.itemCount} items (${processTime.toFixed(2)}ms)`
        });

        timeline.push({
          type: 'chunk-write',
          time: chunkStartTime + readTime + processTime,
          stepName,
          chunkId: chunk.id,
          duration: writeTime,
          description: `Writing chunk (${writeTime.toFixed(2)}ms)`
        });

        timeline.push({
          type: 'chunk-end',
          time: chunkEndTime,
          stepName,
          chunkId: chunk.id,
          description: `${stepName} - Chunk ${chunk.id} completed`
        });

        runningChunks.push({
          chunk,
          startTime: chunkStartTime,
          endTime: chunkEndTime
        });

        chunkIndex++;
      }

      if (runningChunks.length > 0) {
        runningChunks.sort((a, b) => a.endTime - b.endTime);
        const completed = runningChunks.shift();
        chunkResults.push(completed);
        currentTime = completed.endTime;
      }
    }

    const stepEndTime = Math.max(...chunkResults.map(c => c.endTime));

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
