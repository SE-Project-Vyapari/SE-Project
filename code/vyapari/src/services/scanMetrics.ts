export type EntrySource = 'scan' | 'manual';

export interface CartAddLog {
  id: string;
  source: EntrySource;
  productId: string;
  timestamp: number;
}

export interface BillTimingEntry {
  id: string;
  mode: 'scan' | 'manual' | 'mixed';
  itemCount: number;
  scanCount: number;
  manualCount: number;
  timeToBillMs: number;
  completedAt: string;
}

class ScanMetricsService {
  private addLogs: CartAddLog[] = [];
  private billLogs: BillTimingEntry[] = [
    {
      id: 'seed-bill-scan',
      mode: 'scan',
      itemCount: 3,
      scanCount: 3,
      manualCount: 0,
      timeToBillMs: 4200,
      completedAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: 'seed-bill-manual',
      mode: 'manual',
      itemCount: 3,
      scanCount: 0,
      manualCount: 3,
      timeToBillMs: 11800,
      completedAt: new Date(Date.now() - 1800_000).toISOString(),
    },
  ];
  private scanAdditions = 3;
  private manualAdditions = 3;

  recordCartAddition(source: EntrySource, productId: string) {
    if (source === 'scan') {
      this.scanAdditions += 1;
    } else {
      this.manualAdditions += 1;
    }
    this.addLogs.push({
      id: crypto.randomUUID(),
      source,
      productId,
      timestamp: Date.now(),
    });
  }

  recordBillCompleted(params: {
    itemCount: number;
    scanCount: number;
    manualCount: number;
    timeToBillMs: number;
  }) {
    const mode: BillTimingEntry['mode'] =
      params.scanCount > 0 && params.manualCount === 0
        ? 'scan'
        : params.manualCount > 0 && params.scanCount === 0
        ? 'manual'
        : 'mixed';

    this.billLogs.unshift({
      id: crypto.randomUUID(),
      mode,
      itemCount: params.itemCount,
      scanCount: params.scanCount,
      manualCount: params.manualCount,
      timeToBillMs: Math.max(100, Math.round(params.timeToBillMs)),
      completedAt: new Date().toISOString(),
    });
  }

  getSnapshot() {
    const scanBills = this.billLogs.filter(b => b.mode === 'scan');
    const manualBills = this.billLogs.filter(b => b.mode === 'manual');

    const avgScanToBillMs =
      scanBills.length > 0
        ? Math.round(scanBills.reduce((s, b) => s + b.timeToBillMs, 0) / scanBills.length)
        : 0;

    const avgManualToBillMs =
      manualBills.length > 0
        ? Math.round(manualBills.reduce((s, b) => s + b.timeToBillMs, 0) / manualBills.length)
        : 0;

    return {
      scanAdditions: this.scanAdditions,
      manualAdditions: this.manualAdditions,
      avgScanToBillMs,
      avgManualToBillMs,
      scanBillCount: scanBills.length,
      manualBillCount: manualBills.length,
      recentBills: [...this.billLogs],
      recentAdds: [...this.addLogs].slice(-20).reverse(),
    };
  }
}

export const scanMetrics = new ScanMetricsService();

