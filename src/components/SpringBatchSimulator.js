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
  }

  simulate() {
    const timeline = [];
    let currentTime = 0;
    
    if (this.usePartitioner) {
      return this.simulateWithPartitioner(timeline, currentTime);
    } else {
      return this.simulateWithoutPartitioner(timeline, currentTime);
    }
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
