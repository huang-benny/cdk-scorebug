import { CircularProgress } from './CircularProgress';
import { convertToDisplayName } from '@/app/lib/utils';

interface PillarScoresProps {
    pillarScores: Record<string, number>;
    signalScores?: Record<string, Record<string, number>>;
    signalWeights?: Record<string, Record<string, number>>;
}

export function PillarScores({ pillarScores, signalScores, signalWeights }: PillarScoresProps) {
    return (
        <div className="score-section">
            <h3>Pillar Scores</h3>
            <div id="pillarScores">
                {Object.entries(pillarScores).map(([pillar, score]) => {
                    const signals = signalScores?.[pillar] || {};
                    const weights = signalWeights?.[pillar] || {};
                    const signalEntries = Object.entries(signals);

                    return (
                        <div key={pillar} className="pillar-item">
                            <CircularProgress score={score} />
                            <div className="pillar-name">{pillar.toLowerCase()}</div>
                            <div className="tooltip">
                                {signalEntries.length > 0 ? (
                                    signalEntries.map(([name, signalScore]) => {
                                        const weight = weights[name] || 0;
                                        const displayName = convertToDisplayName(name);
                                        return (
                                            <div key={name} className="signal-row">
                                                <span className="signal-name">{displayName}</span>
                                                <span className="signal-score">{signalScore}★ ({weight}%)</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="signal-row">No signals available</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
