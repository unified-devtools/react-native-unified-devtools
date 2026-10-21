/**
 * hermesTracker - Safely samples Hermes runtime heap memory and GC statistics
 * Gracefully no-ops in non-Hermes or Expo Go JSC environments.
 */

export interface HermesMemorySnapshot {
  isHermes: boolean;
  heapAllocatedMb?: number;
  heapTotalMb?: number;
  gcTotalTimeMs?: number;
}

export function getHermesMemorySnapshot(): HermesMemorySnapshot {
  try {
    const hermesInternal = (global as any).HermesInternal;
    if (!hermesInternal || typeof hermesInternal.getRuntimeProperties !== 'function') {
      return { isHermes: false };
    }

    const props = hermesInternal.getRuntimeProperties();
    if (!props) {
      return { isHermes: false };
    }

    const allocatedBytes = parseInt(
      props['Hermes js_allocated_bytes'] || props['js_allocated_bytes'] || '0',
      10
    );
    const heapSizeBytes = parseInt(
      props['Hermes js_heap_size'] || props['js_heap_size'] || '0',
      10
    );
    const gcTime = parseInt(
      props['Hermes gc_total_time'] || props['gc_total_time'] || '0',
      10
    );

    const toMb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

    return {
      isHermes: true,
      heapAllocatedMb: allocatedBytes > 0 ? toMb(allocatedBytes) : undefined,
      heapTotalMb: heapSizeBytes > 0 ? toMb(heapSizeBytes) : undefined,
      gcTotalTimeMs: !isNaN(gcTime) ? gcTime : undefined,
    };
  } catch (err) {
    return { isHermes: false };
  }
}
