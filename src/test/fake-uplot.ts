export class FakeUPlot {
    static instances: FakeUPlot[] = [];

    options: unknown;
    data: unknown;
    size: { width: number; height: number } | null = null;
    destroyed = false;
    cursor: { left: number; top: number } | null = null;
    pixelsPerUnit = 10;

    constructor(options: unknown, data: unknown) {
        this.options = options;
        this.data = data;
        FakeUPlot.instances.push(this);
    }

    setData(data: unknown) {
        this.data = data;
    }

    setSize(size: { width: number; height: number }) {
        this.size = size;
    }

    setCursor(cursor: { left: number; top: number }) {
        this.cursor = cursor;
    }

    valToPos(value: number) {
        return value * this.pixelsPerUnit;
    }

    destroy() {
        this.destroyed = true;
    }

    static reset() {
        FakeUPlot.instances = [];
    }
}
