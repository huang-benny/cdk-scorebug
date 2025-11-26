'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';
import { fetchAuthSession } from 'aws-amplify/auth';
import './styles.css';

interface AnalysisData {
  packageName: string;
  version: string;
  totalScore: number;
  pillarScores: Record<string, number>;
  signalScores?: Record<string, Record<string, number>>;
  signalWeights?: Record<string, Record<string, number>>;
}

function convertToDisplayName(signalName: string): string {
  return signalName
    .replace(/_/g, ' - ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function getScoreColor(score: number): { start: string; end: string } {
  if (score >= 75) {
    const t = (score - 75) / 25;
    const r = Math.round(132 - 132 * t);
    const g = Math.round(204 + 51 * t);
    const b = Math.round(22 - 22 * t);
    return { start: `rgb(${r}, ${g}, ${b})`, end: `rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.8)})` };
  } else if (score >= 50) {
    const t = (score - 50) / 25;
    const r = Math.round(239 - 107 * t);
    const g = Math.round(68 + 136 * t);
    const b = Math.round(68 - 46 * t);
    return { start: `rgb(${r}, ${g}, ${b})`, end: `rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.85)})` };
  } else {
    const t = score / 50;
    const r = Math.round(185 + 54 * t);
    const g = Math.round(28 + 40 * t);
    const b = Math.round(28 + 40 * t);
    return { start: `rgb(${r}, ${g}, ${b})`, end: `rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.8)}, ${Math.round(b * 0.8)})` };
  }
}

function CircularProgress({ score, size = 52, isTotal = false }: { score: number; size?: number; isTotal?: boolean }) {
  const radius = size === 90 ? 36 : 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
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
    if (!isConfigured) return;

    if (!packageName) {
      setError('No package specified. Add ?package=your-package-name to the URL');
      return;
    }

    async function analyzePackage() {
      setLoading(true);
      setError(null);

      try {
        const session = await fetchAuthSession();

        if (!session.credentials) {
          throw new Error('Not authenticated');
        }

        const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');

        const lambdaClient = new LambdaClient({
          region: outputs.auth.aws_region,
          credentials: session.credentials,
        });

        const functionArn = outputs.custom?.analyzePackageFunctionArn;

        if (!functionArn) {
          throw new Error('Lambda function ARN not found in outputs');
        }

        const command = new InvokeCommand({
          FunctionName: functionArn,
          Payload: JSON.stringify({ packageName: packageName?.trim() }),
        });

        const response = await lambdaClient.send(command);

        if (response.FunctionError) {
          throw new Error('Lambda function error: ' + response.FunctionError);
        }

        const payload = JSON.parse(new TextDecoder().decode(response.Payload));

        if (payload.statusCode !== 200) {
          const errorData = JSON.parse(payload.body);
          throw new Error(errorData.message || 'Failed to analyze package');
        }

        const result = JSON.parse(payload.body);
        setData(result.analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    analyzePackage();
  }, [packageName, isConfigured]);

  return (
    <div className="container">
      {loading && (
        <div id="loading">
          <div className="spinner"></div>
          <p>Analyzing package...</p>
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

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

          <div className="score-section">
            <h3>Pillar Scores</h3>
            <div id="pillarScores">
              {Object.entries(data.pillarScores).map(([pillar, score]) => {
                const signalScores = data.signalScores?.[pillar] || {};
                const signalWeights = data.signalWeights?.[pillar] || {};
                const signalEntries = Object.entries(signalScores);

                return (
                  <div key={pillar} className="pillar-item">
                    <CircularProgress score={score} />
                    <div className="pillar-name">{pillar.toLowerCase()}</div>
                    <div className="tooltip">
                      {signalEntries.length > 0 ? (
                        signalEntries.map(([name, signalScore]) => {
                          const weight = signalWeights[name] || 0;
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
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="container"><div id="loading"><div className="spinner"></div><p>Loading...</p></div></div>}>
      <PackageAnalyzer />
    </Suspense>
  );
}
