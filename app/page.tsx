'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';
import { analyzePackage, type AnalysisData } from './lib/aws';
import { CircularProgress } from './components/CircularProgress';
import { PillarScores } from './components/PillarScores';
import './styles.css';

function PackageAnalyzer() {
    const searchParams = useSearchParams();
    const packageName = searchParams.get('package');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<AnalysisData | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            Amplify.configure(outputs, { ssr: true });
            setIsConfigured(true);
        }
    }, []);

    useEffect(() => {
        if (!isConfigured || !packageName) {
            if (!packageName) {
                setError('No package specified. Add ?package=your-package-name to the URL');
            }
            return;
        }

        async function fetchAnalysis() {
            setLoading(true);
            setError(null);

            try {
                const result = await analyzePackage(packageName!);
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalysis();
    }, [packageName, isConfigured]);

    return (
        <div className="container">
            {loading && (
                <div id="loading">
                    <div className="spinner"></div>
                    <p>Analyzing package...</p>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {data && (
                <div id="results">
                    <div className="package-info">
                        <h2>{data.packageName}</h2>
                        <p id="version">Version: {data.version}</p>
                    </div>

                    <div className="score-section total-section">
                        <h3>Total Score</h3>
                        <CircularProgress score={data.totalScore} size={90} isTotal />
                    </div>

                    <PillarScores
                        pillarScores={data.pillarScores}
                        signalScores={data.signalScores}
                        signalWeights={data.signalWeights}
                    />
                </div>
            )}
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={
            <div className="container">
                <div id="loading">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        }>
            <PackageAnalyzer />
        </Suspense>
    );
}
