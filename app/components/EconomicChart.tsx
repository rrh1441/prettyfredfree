/* FILE: app/components/EconomicChart.tsx */
"use client";

import React, { useMemo } from 'react'; // Use useMemo for calculations
import { ResponsiveLine } from "@nivo/line";

// --- Types ---
interface DataPoint {
    date: string;
    value: number | null;
}

interface NivoLineSeries {
    id: string;
    color: string;
    data: { x: string; y: number }[];
}

interface EconomicChartProps {
    // Data and Filtering
    fullData: DataPoint[];         // The complete dataset for this series
    dateRange: [number, number]; // Indices [start, end] from parent state

    // Display Settings from Parent State
    chartId: string;          // Unique ID for the chart line (e.g., title or series_id)
    color: string;
    yMin: string | number;    // Allow 'auto' or number
    yMax: string | number;    // Allow 'auto' or number
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
    if (Math.abs(num) >= 1e6) {
        return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "m";
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
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

    // Filter data based on dateRange prop *inside* the component
    const filteredData = useMemo(() => {
        const start = Math.max(0, dateRange[0]);
        // Add 1 to end index because slice is exclusive at the end
        const end = Math.min(fullData.length, dateRange[1] + 1);
        if (start >= end && fullData.length > 0) {
             // If range is invalid (e.g., start > end), return just the start point if possible
             return fullData.slice(start, start + 1);
        }
        return fullData.slice(start, end);
    }, [fullData, dateRange]);

    // Calculate chart data, ticks, baseline based on filteredData
    const { finalChartData, tickValues, areaBaselineValue, hasEnoughPoints } = useMemo(() => {
        const validFilteredData = filteredData ?? []; // Ensure it's an array
        const currentHasEnoughPoints = validFilteredData.filter(d => d.value !== null).length >= 2;

        const segments = createSegments(validFilteredData);
        const chartData: NivoLineSeries[] = segments.map((segment, idx) => ({
            id: `${chartId}_${idx}`, // Ensure unique ID for Nivo
            color: color,
            data: segment.map((d) => ({ x: d.date, y: d.value ?? 0 })),
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
            baseline = minValue >= 0 ? 0 : minValue; // Baseline at 0 or actual min if negative values exist
             // Respect manual yMin if set and valid
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
    }, [filteredData, chartId, color, yMin]); // Dependencies for recalculation

    const computedYMin = useMemo(() => (yMin === 'auto' ? 'auto' : Number(yMin)), [yMin]);
    const computedYMax = useMemo(() => (yMax === 'auto' ? 'auto' : Number(yMax)), [yMax]);

    // --- Render Nivo Chart ---
    return (
        <div className="h-[350px] w-full bg-white"> {/* Chart container */}
            {!hasEnoughPoints ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    Not enough data points for selected range.
                </div>
            ) : (
                <ResponsiveLine
                    data={finalChartData}
                    colors={[color]} // Nivo expects an array or function
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
                     tooltip={({ point }) => ( // Custom tooltip
                           <div style={{ background: 'white', padding: '9px 12px', border: '1px solid #ccc', fontSize: '12px' }}>
                               <strong>Date:</strong> {point.data.xFormatted}<br />
                               <strong>Value:</strong> {formatYAxis(point.data.y)}
                           </div>
                       )}
                    theme={{ /* Theme settings from previous step */
                        background: "#fff",
                        axis: {
                            domain: { line: { stroke: "#d1d5db", strokeWidth: 1 } },
                            ticks: { line: { stroke: "#d1d5db", strokeWidth: 1 }, text: { fill: "#4b5563", fontSize: 10 } },
                            legend: { text: { fill: "#374151", fontSize: 12, fontWeight: 'bold' } },
                        },
                        grid: { line: { stroke: "#e5e7eb", strokeWidth: 0.5, strokeDasharray: "2 2" } },
                        tooltip: { container: { background: "#ffffff", color: "#333333", fontSize: "12px", borderRadius: "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "5px 9px" } },
                    }}
                    legends={[]}
                />
            )}
        </div>
    );
}