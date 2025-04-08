/* FILE: app/components/EconomicChart.tsx */
"use client";

import React, { useMemo } from 'react';
import { ResponsiveLine, PointTooltipProps } from "@nivo/line";

// --- Types ---
interface DataPoint {
    date: string;
    value: number | null;
}

interface NivoLineSeries {
    id: string;
    color: string;
    // FIX: Define 'data' as an array of points
    data: { x: string; y: number | null; }[];
}

interface EconomicChartProps {
    // Data and Filtering
    fullData: DataPoint[];
    dateRange: [number, number];

    // Display Settings from Parent State
    chartId: string;
    color: string;
    yMin: string | number;
    yMax: string | number;
    showPoints: boolean;
}

// --- Utility Functions ---
function createSegments(dataArray: DataPoint[]): DataPoint[][] {
    const segments: DataPoint[][] = [];
    let currentSegment: DataPoint[] = [];
    for (const pt of dataArray) {
        if (pt.value === null) {
            if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
        } else {
            currentSegment.push(pt);
        }
    }
    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }
    return segments;
}

const formatYAxis = (val: number | string): string => {
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num)) return '';
    if (Math.abs(num) < 1e-9) return '0';
    if (Math.abs(num) >= 1e6) {
        return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "m";
    }
    return num.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
     });
};

// --- Component ---
export default function EconomicChart({
    fullData,
    dateRange,
    chartId,
    color,
    yMin,
    yMax,
    showPoints,
}: EconomicChartProps) {

    const filteredData = useMemo(() => {
        const start = Math.max(0, dateRange[0]);
        const end = Math.min(fullData.length, dateRange[1] + 1);
        if (start >= end && fullData.length > 0) {
             return fullData.slice(start, start + 1);
        }
        const validEnd = Math.max(start, end);
        return fullData.slice(start, validEnd);
    }, [fullData, dateRange]);

    const { finalChartData, tickValues, areaBaselineValue, hasEnoughPoints } = useMemo(() => {
        const validFilteredData = filteredData ?? [];
        const currentHasEnoughPoints = validFilteredData.filter(d => d.value !== null).length >= 2;

        const segments = createSegments(validFilteredData);
        // This assignment should now be type-correct
        const chartData: NivoLineSeries[] = segments.map((segment, idx) => ({
            id: `${chartId}_${idx}`,
            color: color,
            data: segment.map((d) => ({ x: d.date, y: d.value })), // y is number | null
        }));

        const interval = currentHasEnoughPoints ? Math.max(1, Math.ceil(validFilteredData.length / 12)) : 1;
        const ticks = validFilteredData.length > 0 ? validFilteredData
            .map((d) => d.date)
            .filter((_, i) => i % interval === 0) : [];
        const lastDate = validFilteredData.length > 0 ? validFilteredData[validFilteredData.length - 1]?.date : null;
        if (lastDate && !ticks.includes(lastDate)) {
            ticks.push(lastDate);
        }

        let baseline: number | 'auto' = 0;
        const values = validFilteredData
            .map((d) => d.value)
            .filter((v): v is number => v != null);
        if (values.length > 0) {
            const minValue = Math.min(...values);
            baseline = minValue >= 0 ? 0 : minValue;
             if (yMin !== 'auto' && !isNaN(Number(yMin))) {
                 baseline = Math.max(baseline, Number(yMin));
             }
        } else {
             baseline = 'auto';
        }

        return {
            finalChartData: chartData,
            tickValues: ticks,
            areaBaselineValue: baseline,
            hasEnoughPoints: currentHasEnoughPoints
        };
    }, [filteredData, chartId, color, yMin]);

    const computedYMin = useMemo(() => (yMin === 'auto' ? 'auto' : Number(yMin)), [yMin]);
    const computedYMax = useMemo(() => (yMax === 'auto' ? 'auto' : Number(yMax)), [yMax]);

    const CustomTooltip = ({ point }: PointTooltipProps) => {
        const yValue = point.data.y ?? 0;
        return (
            <div style={{ background: 'white', padding: '9px 12px', border: '1px solid #ccc', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '2px' }}>
                <strong>Date:</strong> {point.data.xFormatted}<br />
                <strong>Value:</strong> {formatYAxis(Number(yValue))}
            </div>
        );
    };

    // --- Render Nivo Chart ---
    return (
        <div className="h-[350px] w-full bg-white"> {/* Chart container */}
            {!hasEnoughPoints ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    Not enough data points for selected range.
                </div>
            ) : (
                <ResponsiveLine
                    data={finalChartData.map(series => ({
                        ...series,
                        data: series.data.map(d => ({ ...d, y: d.y ?? 0 }))
                    }))}
                    colors={[color]}
                    margin={{ top: 20, right: 30, bottom: 60, left: 70 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: computedYMin, max: computedYMax, stacked: false }}
                    axisBottom={{ tickSize: 5, tickPadding: 10, tickRotation: -45, tickValues: tickValues }}
                    axisLeft={{ tickSize: 5, tickPadding: 5, format: formatYAxis }}
                    curve="linear"
                    useMesh={true}
                    enableSlices={false}
                    enableArea={true}
                    areaOpacity={0.1}
                    areaBaselineValue={areaBaselineValue}
                    enablePoints={showPoints}
                    pointSize={showPoints ? 4 : 0}
                    pointBorderWidth={showPoints ? 1 : 0}
                    pointBorderColor={{ from: "serieColor" }}
                    pointColor={{ theme: "background" }}
                    tooltip={CustomTooltip}
                    theme={{
                        background: "#fff",
                        axis: {
                            domain: { line: { stroke: "#d1d5db", strokeWidth: 1 } },
                            ticks: { line: { stroke: "#d1d5db", strokeWidth: 1 }, text: { fill: "#4b5563", fontSize: 10 } },
                            legend: { text: { fill: "#374151", fontSize: 12, fontWeight: 'bold' } },
                        },
                        grid: { line: { stroke: "#e5e7eb", strokeWidth: 0.5, strokeDasharray: "2 2" } },
                    }}
                    legends={[]}
                />
            )}
        </div>
    );
}