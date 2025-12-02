import { getScoreColorStrings } from '@/app/lib/utils';

interface CircularProgressProps {
    score: number;
    size?: number;
    isTotal?: boolean;
}

export function CircularProgress({ score, size = 52, isTotal = false }: CircularProgressProps) {
    const radius = size === 90 ? 36 : 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColorStrings(score);
    const id = `gradient-${Math.random()}`;

    return (
        <div className={`circular-progress ${isTotal ? 'total-progress' : ''}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: color.start, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: color.end, stopOpacity: 1 }} />
                    </linearGradient>
                </defs>
                <circle className="progress-bg" cx={size / 2} cy={size / 2} r={radius}></circle>
                <circle
                    className="progress-bar"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    style={{ strokeDasharray: circumference, strokeDashoffset: offset, stroke: `url(#${id})` }}
                ></circle>
            </svg>
            <div className="progress-value">{score}</div>
        </div>
    );
}
