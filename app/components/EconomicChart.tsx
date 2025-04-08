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
    data: { x: string; y: number | null; }[];
}

interface EconomicChartProps {
    fullData: DataPoint[];
    dateRange: [number, number];
    chartId: string;
    color: string;
    yMin: string | number; // User-provided setting ('auto' or number)
    yMax: string | number; // User-provided setting ('auto' or number)
    showPoints: boolean;
}

// --- Utility Functions ---
function createSegments(dataArray: DataPoint[]): DataPoint[][] { /* ... Function unchanged ... */
    const segments: DataPoint[][] = [];
    let currentSegment: DataPoint[] = [];
    for (const pt of dataArray) { if (pt.value === null) { if (currentSegment.length > 0) { segments.push(currentSegment); currentSegment = []; } } else { currentSegment.push(pt); } }
    if (currentSegment.length > 0) { segments.push(currentSegment); }
    return segments;
}

const formatYAxis = (val: number | string): string => { /* ... Function unchanged ... */
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num)) return ''; if (Math.abs(num) < 1e-9) return '0'; if (Math.abs(num) >= 1e6) { return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "m"; }
    return num.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

// --- Component ---
export default function EconomicChart({
    fullData,
    dateRange,
    chartId,
    color,
    yMin: yMinProp, // Rename prop to avoid conflict with calculated min
    yMax: yMaxProp, // Rename prop
    showPoints,
}: EconomicChartProps) {

    const filteredData = useMemo(() => { /* ... Calculation unchanged ... */
        const start = Math.max(0, dateRange[0]); const end = Math.min(fullData.length, dateRange[1] + 1); if (start >= end && fullData.length > 0) { return fullData.slice(start, start + 1); } const validEnd = Math.max(start, end); return fullData.slice(start, validEnd);
    }, [fullData, dateRange]);

    const {
        finalChartData,
        tickValues,
        calculatedYMin, // This will be the final minimum value for the Y axis
        calculatedYMax, // Final maximum value for Y axis
        areaBaselineValue, // Baseline for the area fill
        hasEnoughPoints
    } = useMemo(() => {
        const validFilteredData = filteredData ?? [];
        const currentHasEnoughPoints = validFilteredData.filter(d => d.value !== null).length >= 2;

        // Basic chart data generation
        const segments = createSegments(validFilteredData);
        const chartData: NivoLineSeries[] = segments.map((segment, idx) => ({ id: `${chartId}_${idx}`, color: color, data: segment.map((d) => ({ x: d.date, y: d.value })), }));

        // X-axis ticks
        const interval = currentHasEnoughPoints ? Math.max(1, Math.ceil(validFilteredData.length / 12)) : 1;
        const ticks = validFilteredData.length > 0 ? validFilteredData.map((d) => d.date).filter((_, i) => i % interval === 0) : [];
        const lastDate = validFilteredData.length > 0 ? validFilteredData[validFilteredData.length - 1]?.date : null;
        if (lastDate && !ticks.includes(lastDate)) { ticks.push(lastDate); }

        // Determine Y-axis min/max and area baseline
        let finalYMin: number | 'auto' = 'auto';
        let finalYMax: number | 'auto' = 'auto';
        let baseline: number | 'auto' = 'auto';
        const values = validFilteredData.map((d) => d.value).filter((v): v is number => v != null);

        if (values.length > 0) {
            const dataMinValue = Math.min(...values);
            const dataMaxValue = Math.max(...values);

            // Determine Y-axis Minimum
            if (yMinProp === 'auto') {
                finalYMin = dataMinValue; // Set axis min to data min
            } else if (!isNaN(Number(yMinProp))) {
                finalYMin = Number(yMinProp); // Use valid manual min
            } // else remains 'auto' if invalid manual value

            // Determine Y-axis Maximum
            if (yMaxProp === 'auto') {
                 // Let Nivo handle 'auto' max unless min is higher or equal
                 if (finalYMin !== 'auto' && dataMaxValue <= finalYMin) {
                      finalYMax = finalYMin + (dataMaxValue === finalYMin ? 1 : (dataMaxValue - finalYMin)*0.1); // Add small padding if min=max
                 } else {
                      finalYMax = 'auto'; // Let Nivo calculate based on data > finalYMin
                 }

            } else if (!isNaN(Number(yMaxProp))) {
                finalYMax = Number(yMaxProp); // Use valid manual max
                // Ensure manual max is greater than calculated/manual min
                if (finalYMin !== 'auto' && finalYMax <= finalYMin) {
                     finalYMax = finalYMin + 1; // Ensure max > min
                 }
            } // else remains 'auto'

            // Set Area Baseline to match the final Y-axis minimum
            baseline = finalYMin;

        } else {
            // No data, keep everything auto
            finalYMin = 'auto';
            finalYMax = 'auto';
            baseline = 'auto';
        }

        return {
            finalChartData: chartData,
            tickValues: ticks,
            calculatedYMin: finalYMin, // Use this for yScale.min
            calculatedYMax: finalYMax, // Use this for yScale.max
            areaBaselineValue: baseline, // Use this for areaBaselineValue
            hasEnoughPoints: currentHasEnoughPoints
        };
    }, [filteredData, chartId, color, yMinProp, yMaxProp]); // Depend on props

    const CustomTooltip = ({ point }: PointTooltipProps) => { /* ... Component unchanged ... */
        const yValue = point.data.y ?? 0; return ( <div style={{ background: 'white', padding: '9px 12px', border: '1px solid #ccc', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '2px' }}> <strong>Date:</strong> {point.data.xFormatted}<br /> <strong>Value:</strong> {formatYAxis(Number(yValue))} </div> );
    };

    // --- Render Nivo Chart ---
    return (
        // FIX: REMOVED style={{ height: '350px' }}
        <div className="w-full bg-white flex-grow" style={{ minHeight: '350px' }}> {/* Use minHeight and allow flex-grow */}
            {!hasEnoughPoints ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    Not enough data points for selected range.
                </div>
            ) : (
                <ResponsiveLine
                    data={finalChartData.map(series => ({
                        ...series,
                        data: series.data.map(d => ({ ...d, y: d.y ?? null })) // Pass nulls to Nivo, segmentation handles gaps
                    }))}
                    colors={[color]}
                    margin={{ top: 20, right: 30, bottom: 70, left: 70 }} // Kept increased bottom margin
                    xScale={{ type: "point" }}
                    // FIX: Use calculated min/max for Y scale
                    yScale={{ type: "linear", min: calculatedYMin, max: calculatedYMax, stacked: false }}
                    axisBottom={{ tickSize: 5, tickPadding: 10, tickRotation: -45, tickValues: tickValues }}
                    axisLeft={{ tickSize: 5, tickPadding: 5, format: formatYAxis }}
                    curve="linear"
                    useMesh={true}
                    enableSlices={false}
                    enableArea={true}
                    areaOpacity={0.1}
                    // FIX: Use calculated area baseline value
                    areaBaselineValue={areaBaselineValue}
                    enablePoints={showPoints}
                    pointSize={showPoints ? 4 : 0}
                    pointBorderWidth={showPoints ? 1 : 0}
                    pointBorderColor={{ from: "serieColor" }}
                    pointColor={{ theme: "background" }}
                    tooltip={CustomTooltip}
                    theme={{ /* ... Theme unchanged ... */
                        background: "#fff",
                        axis: { domain: { line: { stroke: "#d1d5db", strokeWidth: 1 } }, ticks: { line: { stroke: "#d1d5db", strokeWidth: 1 }, text: { fill: "#4b5563", fontSize: 10 } }, legend: { text: { fill: "#374151", fontSize: 12, fontWeight: 'bold' } }, },
                        grid: { line: { stroke: "#e5e7eb", strokeWidth: 0.5, strokeDasharray: "2 2" } },
                    }}
                    legends={[]}
                    // Important for area fill: Define layer order to ensure axes are on top
                    layers={['grid', 'markers', 'areas', 'lines', 'points', 'axes', 'slices', 'mesh', 'legends']}
                     // Handle cases where data might have nulls - Nivo should create gaps
                     enablePointLabel={false} // Typically off for line charts
                     defs={[]} // Define any gradients/patterns if needed
                     fill={[]} // Define fill rules if using patterns
                />
            )}
        </div>
    );
}