export type RGB = { r: number; g: number; b: number };

export function getScoreColor(score: number): RGB {
    const ranges = [
        { min: 75, start: { r: 132, g: 204, b: 22 }, end: { r: 0, g: 255, b: 0 } },
        { min: 50, start: { r: 239, g: 68, b: 68 }, end: { r: 132, g: 204, b: 22 } },
        { min: 0, start: { r: 185, g: 28, b: 28 }, end: { r: 239, g: 68, b: 68 } },
    ];

    const range = ranges.find(r => score >= r.min) || ranges[2];
    const rangeSize = range.min === 75 ? 25 : range.min === 50 ? 25 : 50;
    const t = (score - range.min) / rangeSize;

    return {
        r: Math.round(range.start.r + (range.end.r - range.start.r) * t),
        g: Math.round(range.start.g + (range.end.g - range.start.g) * t),
        b: Math.round(range.start.b + (range.end.b - range.start.b) * t),
    };
}

export function getScoreColorStrings(score: number): { start: string; end: string } {
    const color = getScoreColor(score);
    return {
        start: `rgb(${color.r},${color.g},${color.b})`,
        end: `rgb(${Math.round(color.r * 0.8)},${Math.round(color.g * 0.85)},${Math.round(color.b * 0.8)})`,
    };
}

export function convertToDisplayName(signalName: string): string {
    return signalName
        .replace(/_/g, ' - ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/\s+/g, ' ')
        .trim();
}
