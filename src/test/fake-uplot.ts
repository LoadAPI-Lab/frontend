export class FakeUPlot {
    static instances: FakeUPlot[] = [];

    static paths = { bars: () => null, spline: () => null };

    options: unknown;
    data: unknown;
    size: { width: number; height: number } | null = null;
    destroyed = false;
    cursor: { left: number; top: number } | null = null;
    pixelsPerUnit = 10;
    scale: { min: number; max: number } | null = null;
    select = { left: 0, top: 0, width: 0, height: 0 };

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

    setScale(_key: string, scale: { min: number; max: number }) {
        this.scale = scale;
    }

    setSelect(select: { left: number; top: number; width: number; height: number }) {
        this.select = select;
    }

    posToVal(position: number) {
        return position / this.pixelsPerUnit;
    }

    destroy() {
        this.destroyed = true;
    }

    static reset() {
        FakeUPlot.instances = [];
    }
}
