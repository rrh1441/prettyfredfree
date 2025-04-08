/* FILE: app/HomeClient.tsx */
"use client";

import React, { useState, useRef, useEffect, FormEvent, useCallback } from "react";
import Image from "next/image";
import html2canvas from "html2canvas";

import { supabase } from "@/lib/supabaseClient";
import EconomicChart from "@/components/EconomicChart";
import Card from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider"; // Import Slider
import { Switch } from "@/components/ui/switch"; // Import Switch

// --- Types ---
interface FredRow { date: string; value: number | null; }
interface SeriesData { series_id: string; description: string; data: DataPoint[]; }
interface SeriesMeta { series_id: string; description: string; }
interface DataPoint { date: string; value: number | null; }

// State for individual chart settings
interface ChartSettings {
    title: string; // Allow editing title
    chartColor: string;
    yMin: string; // Keep as string to allow 'auto'
    yMax: string; // Keep as string to allow 'auto'
    showPoints: boolean;
    showAdvanced: boolean;
    dateRange: [number, number];
    // Note: Second series state removed for simplicity
}

// --- Data ---
const FULL_SERIES_LIST: SeriesMeta[] = [
    { series_id: "A191RL1A225NBEA", description: "Real Personal Consumption Expenditures" },
    { series_id: "AHETPI", description: '"Average Hourly Earnings: Total Private, All Employees"' },
    { series_id: "AWHMAN", description: "Average Weekly Hours of Manufacturing Employees: Total Private" },
    { series_id: "AWHNONAG", description: "Average Weekly Hours of Production and Nonsupervisory Employees: Total Private" },
    { series_id: "BUSINV", description: "Business Inventories" },
    { series_id: "CFNAI", description: "Chicago Fed National Activity Index" },
    { series_id: "CIVPART", description: "Civilian Employment–Population Ratio" },
    { series_id: "CLF16OV", description: "Civilian Labor Force" },
    { series_id: "CP", description: "Corporate Profits After Tax (Seasonally Adjusted)" },
    { series_id: "CPIAUCSL", description: "Consumer Price Index for All Urban Consumers: All Items" },
    { series_id: "CPILFESL", description: "Core Consumer Price Index (Excludes Food and Energy)" },
    { series_id: "CSUSHPINSA", description: "S&P/Case-Shiller U.S. National Home Price Index" },
    { series_id: "CUSR0000SEHA", description: "Consumer Price Index for Urban Wage Earners and Clerical Workers: All Items" },
    { series_id: "DCOILWTICO", description: "West Texas Intermediate (WTI) Crude Oil Price" },
    { series_id: "DGORDER", description: "Durable Goods Orders" },
    { series_id: "DGS10", description: "10-Year Treasury Constant Maturity Rate" },
    { series_id: "DGS1MO", description: "1-Month Treasury Constant Maturity Rate" },
    { series_id: "DGS2", description: "2-Year Treasury Constant Maturity Rate" },
    { series_id: "DGS30", description: "30-Year Treasury Constant Maturity Rate" },
    { series_id: "DGS3MO", description: "3-Month Treasury Bill: Secondary Market Rate" },
    { series_id: "DGS5", description: "5-Year Treasury Constant Maturity Rate" },
    { series_id: "DGS6MO", description: "6-Month Treasury Bill: Secondary Market Rate" },
    { series_id: "DHHNGSP", description: "Henry Hub Natural Gas Spot Price" },
    { series_id: "DJIA", description: "Dow Jones Industrial Average" },
    { series_id: "DSPIC96", description: "Real Disposable Personal Income" },
    { series_id: "EXHOSLUSM495S", description: "Existing Home Sales" },
    { series_id: "EXPGS", description: "Exports of Goods and Services" },
    { series_id: "FEDFUNDS", description: "Effective Federal Funds Rate" },
    { series_id: "GDP", description: "Gross Domestic Product (Nominal)" },
    { series_id: "GDPC1", description: "Real Gross Domestic Product (Chained 2012 Dollars)" },
    { series_id: "GDPCA", description: "Gross Domestic Product: Chain-type Price Index" },
    { series_id: "GDPDEF", description: "Gross Domestic Product Deflator" },
    { series_id: "GDPPOT", description: "Potential Gross Domestic Product" },
    { series_id: "GFDEBTN", description: "Federal Debt: Total Public Debt" },
    { series_id: "GNPCA", description: "Gross National Product, Chain-type Price Index" },
    { series_id: "GPDI", description: "Gross Private Domestic Investment" },
    { series_id: "HOUST", description: "Housing Starts" },
    { series_id: "ICSA", description: "Initial Unemployment Claims" },
    { series_id: "IMPGS", description: "Imports of Goods and Services" },
    { series_id: "INDPRO", description: "Industrial Production Index" },
    { series_id: "IPFINAL", description: "Industrial Production: Final Products" },
    { series_id: "IPMAN", description: "Industrial Production: Manufacturing" },
    { series_id: "IPMANNS", description: "Industrial Production: Manufacturing (Not Seasonally Adjusted)" },
    { series_id: "JTSJOL", description: "Job Openings (JOLTS)" },
    { series_id: "M1REAL", description: "Real M1 Money Stock" },
    { series_id: "M1SL", description: "M1 Money Stock" },
    { series_id: "M2REAL", description: "Real M2 Money Stock" },
    { series_id: "M2SL", description: "M2 Money Stock" },
    { series_id: "MORTGAGE15US", description: "15-Year Fixed Rate Mortgage Average" },
    { series_id: "MORTGAGE30US", description: "30-Year Fixed Rate Mortgage Average" },
    { series_id: "NETEXP", description: "Net Exports of Goods and Services" },
    { series_id: "NFCI", description: "National Financial Conditions Index" },
    { series_id: "PAYEMS", description: "Total Nonfarm Payrolls" },
    { series_id: "PAYNSA", description: "Total Nonfarm Payrolls: Not Seasonally Adjusted" },
    { series_id: "PCEC", description: "Personal Consumption Expenditures" },
    { series_id: "PCEPI", description: "Personal Consumption Expenditures: Price Index" },
    { series_id: "PERMITNSA", description: "New Private Housing Units Authorized by Building Permits" },
    { series_id: "PI", description: "Personal Income" },
    { series_id: "PPIACO", description: "Producer Price Index for All Commodities" },
    { series_id: "PPIITM", description: "Producer Price Index: Intermediate Materials" },
    { series_id: "PSAVERT", description: "Personal Savings Rate" },
    { series_id: "RECPROUSM156N", description: "Real Estate Price Index: U.S. All-Transactions" },
    { series_id: "RSAFS", description: "Retail Sales" },
    { series_id: "SP500", description: "S&P 500 Index" },
    { series_id: "STLFSI", description: "St. Louis Financial Stress Index" },
    { series_id: "T10Y2Y", description: "10-Year Treasury Minus 2-Year Treasury Yield Spread" },
    { series_id: "T10YIE", description: "10-Year Breakeven Inflation Rate" },
    { series_id: "T5YIE", description: "5-Year Breakeven Inflation Rate" },
    { series_id: "TCU", description: "Capacity Utilization: Total Industry" },
    { series_id: "TEDRATE", description: "TED Spread" },
    { series_id: "TOTALSA", description: "Total Vehicle Sales" },
    { series_id: "TOTALSL", description: "Consumer Credit Outstanding (Total)" },
    { series_id: "TOTCI", description: "Total Construction Spending" },
    { series_id: "TWEXB", description: "Trade Weighted U.S. Dollar Index" },
    { series_id: "U6RATE", description: "U6 Unemployment Rate" },
    { series_id: "UMCSENT", description: "University of Michigan Consumer Sentiment Index" },
    { series_id: "UNRATE", description: "Civilian Unemployment Rate" },
    { series_id: "UNRATENSA", description: "Civilian Unemployment Rate: Not Seasonally Adjusted" },
    { series_id: "USREC", description: "US Recession Probabilities (NBER-based)" },
    { series_id: "VIXCLS", description: "CBOE Volatility Index" },
    { series_id: "W875RX1", description: "Federal Surplus/Deficit as Percent of GDP" },
    { series_id: "WALCL", description: "Total Assets of the Federal Reserve (H.4.1 Data)" },
];

export default function HomeClient() {
    // Component State
    const [allSeriesData, setAllSeriesData] = useState<SeriesData[]>([]); // Holds the actual data fetched
    const [loading, setLoading] = useState(true);
    const [pinnedIDs, setPinnedIDs] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAllSeriesModal, setShowAllSeriesModal] = useState(false);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // State for settings of all charts, keyed by series_id
    const [chartSettingsMap, setChartSettingsMap] = useState<Record<string, ChartSettings>>({});

    // Refs for chart export containers
    const chartExportRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

    // Fetch actual data for all series
    useEffect(() => {
        async function fetchAllData() {
            setLoading(true);
            try {
                const results: SeriesData[] = [];
                const initialSettings: Record<string, ChartSettings> = {};
                // Limit concurrent fetches if needed, e.g., using Promise.all with slicing
                for (const meta of FULL_SERIES_LIST) {
                    const { data: rows, error } = await supabase
                        .from("fred_data")
                        .select("date, value")
                        .eq("series_id", meta.series_id)
                        .order("date", { ascending: true });

                    if (error) {
                        console.warn(`Error fetching ${meta.series_id}:`, error.message);
                        continue;
                    }

                    const chartData = (rows ?? []).map((r: FredRow) => ({
                        date: r.date, value: r.value
                    }));

                    results.push({
                        series_id: meta.series_id,
                        description: meta.description,
                        data: chartData,
                    });

                    // Initialize settings for this chart
                     const dataLength = chartData.length;
                    initialSettings[meta.series_id] = {
                        title: meta.description, // Start with original description
                        chartColor: '#6E59A5',
                        yMin: 'auto',
                        yMax: 'auto',
                        showPoints: false,
                        showAdvanced: false,
                         // Handle empty data case for range
                         dateRange: dataLength > 0 ? [0, dataLength - 1] : [0, 0],
                    };
                }
                setAllSeriesData(results);
                setChartSettingsMap(initialSettings); // Set initial settings after data is fetched

            } catch (err) {
                console.error("Unexpected error fetching series data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchAllData();
    }, []); // Run once on mount

    // --- State Update Functions ---
    const updateChartSetting = useCallback((seriesId: string, key: keyof ChartSettings, value: any) => {
        setChartSettingsMap(prev => {
            // Ensure the seriesId exists before trying to update
            if (!prev[seriesId]) {
                console.warn(`Attempted to update settings for non-existent seriesId: ${seriesId}`);
                return prev;
            }
            return {
                ...prev,
                [seriesId]: {
                    ...prev[seriesId],
                    [key]: value,
                }
            };
        });
    }, []); // No dependencies, function definition is stable


    const handleDateRangeChange = useCallback((seriesId: string, value: [number, number]) => {
        const seriesData = allSeriesData.find(s => s.series_id === seriesId)?.data;
        const maxIndex = seriesData ? Math.max(0, seriesData.length - 1) : 0;

        // Clamp values to valid range [0, maxIndex]
        let start = Math.max(0, Math.min(value[0], maxIndex));
        let end = Math.max(0, Math.min(value[1], maxIndex));

        // Ensure start <= end
        if (start > end) {
            start = end; // Or swap them if preferred: [start, end] = [end, start]
        }

        updateChartSetting(seriesId, 'dateRange', [start, end]);
    }, [allSeriesData, updateChartSetting]); // Depends on data and update function

    // --- Filtering Logic (based on allSeriesData) ---
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let filteredSeriesMeta = FULL_SERIES_LIST; // Start filtering from the meta list
     if (normalizedSearch) {
         filteredSeriesMeta = FULL_SERIES_LIST.filter(
             (s) =>
                 s.series_id.toLowerCase().includes(normalizedSearch) ||
                 s.description.toLowerCase().includes(normalizedSearch)
         );
     }
     // Create the combined list based on filtered metadata and pinning order
     const filteredSeriesIds = new Set(filteredSeriesMeta.map(s => s.series_id));
     const pinned = pinnedIDs.filter(id => filteredSeriesIds.has(id));
     const unpinned = Array.from(filteredSeriesIds).filter(id => !pinnedIDs.includes(id));
     const combinedSeriesIds = [...pinned, ...unpinned];


    // --- Pagination Logic (based on combinedSeriesIds) ---
    const totalItems = combinedSeriesIds.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (currentPage < 1 && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const displayedSeriesIds = combinedSeriesIds.slice(startIndex, endIndex);

    // --- Export Functions ---
    function downloadDataUrl(dataUrl: string, filename: string) {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function exportChartImage(seriesId: string, format: 'png' | 'jpeg') {
        // Target the specific div meant for export
        const chartExportArea = chartExportRefs.current.get(seriesId);
        if (!chartExportArea) {
            console.error(`Export container ref not found for series ${seriesId}`);
            alert(`Failed to export ${format.toUpperCase()}: Chart area not found.`);
            return;
        }

        try {
             // No need to hide elements, just capture the correct div
            const canvas = await html2canvas(chartExportArea, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff', // Vital for JPG and transparent PNGs
                logging: false,
            });
            const dataUrl = format === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9);
            downloadDataUrl(dataUrl, `${seriesId}.${format}`);
        } catch (error) {
            console.error(`Error exporting ${format.toUpperCase()}:`, error);
            alert(`Failed to export chart as ${format.toUpperCase()}.`);
        }
    }

    async function handleExportPng(seriesId: string) { await exportChartImage(seriesId, 'png'); }
    async function handleExportJpg(seriesId: string) { await exportChartImage(seriesId, 'jpeg'); }

     function handleExportCsv(seriesId: string) {
        const series = allSeriesData.find(s => s.series_id === seriesId);
         if (!series || !series.data || series.data.length === 0) {
             alert("No data available to export.");
             return;
         }
         let csv = "date,value\n";
         series.data.forEach((pt) => {
             const valueStr = pt.value === null || pt.value === undefined ? "" : String(pt.value);
             csv += `${pt.date},${valueStr}\n`;
         });
         const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
         const url = URL.createObjectURL(blob);
         downloadDataUrl(url, `${series.series_id}.csv`);
         URL.revokeObjectURL(url);
     }

    // --- Other Handlers ---
    async function handleRequestSubmit(e: FormEvent<HTMLFormElement>) { /* ... keep as before ... */
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const requested_series_id = formData.get("requested_series_id")?.toString().trim() || "";
        const notes = formData.get("notes")?.toString().trim() || "";
        if (!requested_series_id) { alert("Please enter a series ID."); return; }
        try {
            const { error } = await supabase.from("series_requests").insert([{ requested_series_id, notes }]);
            if (error) throw error;
            alert("Request submitted successfully!");
            setShowRequestForm(false);
            (e.target as HTMLFormElement).reset();
        } catch (error) {
            console.error("Error submitting request:", error);
            alert(`Error submitting request: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
     }
    const togglePin = (seriesId: string) => { /* ... keep as before ... */
         setPinnedIDs((prev) =>
             prev.includes(seriesId)
                 ? prev.filter((id) => id !== seriesId)
                 : [...prev, seriesId]
         );
     };

     // --- Pagination UI ---
     const renderPageSelectionBar = () => { /* ... keep as before ... */
         if (totalPages <= 1) { return null; }
         return (
             <div className="flex flex-wrap items-center justify-center gap-2 my-4 sm:my-6">
                 <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</Button>
                 <span className="text-sm text-gray-700">
                     Page
                     <select aria-label="Select page number" value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="mx-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                         {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (<option key={pageNum} value={pageNum}>{pageNum}</option>))}
                     </select>
                     of {totalPages}
                 </span>
                 <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
             </div>
         );
     };

    // --- Render Component ---
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Logo */}
                <div className="text-center mb-8"><div className="flex justify-center mb-4"><Image src="/prettyfred-logo.png" alt="PrettyFRED Logo" width={600} height={200} priority /></div></div>

                {/* Top Controls */}
                <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 mb-4 sm:mb-6">
                     <Input type="search" placeholder="Search by series ID or description..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full sm:w-auto flex-grow sm:max-w-xs md:max-w-sm" />
                     <Button variant="outline" onClick={() => setShowAllSeriesModal(true)}>Show All Series List</Button>
                     <Button variant="outline" onClick={() => setShowRequestForm(true)}>Request a Data Series</Button>
                </div>

                {/* Loading or Content */}
                {loading ? (
                    <div className="text-center my-10"><p className="text-lg font-medium text-gray-600">Loading chart data...</p></div>
                ) : (
                    <>
                        {renderPageSelectionBar()} {/* Top Pagination */}

                        {totalItems === 0 ? (
                            <div className="text-center my-10 text-gray-700">{searchTerm ? 'No charts match your search.' : 'No chart data available.'}</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {displayedSeriesIds.map((seriesId) => {
                                    // Find the full data and current settings for this series
                                    const series = allSeriesData.find(s => s.series_id === seriesId);
                                    const settings = chartSettingsMap[seriesId];

                                    // Skip rendering if data or settings are somehow missing (shouldn't happen with init)
                                    if (!series || !settings) {
                                        console.warn(`Missing data or settings for ${seriesId}`);
                                        return null;
                                    }
                                     const currentDataLength = series.data.length;

                                    return (
                                        <Card key={seriesId} className="p-4 flex flex-col h-full"> {/* Use h-full for consistent card height */}
                                            {/* --- Section 1: Controls (Outside Export Area) --- */}
                                            <div className="chart-controls">
                                                {/* Title/Subtitle Input and Pin Button */}
                                                 <div className="flex justify-between items-start mb-2 gap-2">
                                                     {/* Editable Title */}
                                                     <Input
                                                         type="text"
                                                         value={settings.title}
                                                         onChange={(e) => updateChartSetting(seriesId, 'title', e.target.value)}
                                                         className="text-base font-semibold border-0 shadow-none focus-visible:ring-0 p-0 h-auto flex-grow mr-2"
                                                         aria-label={`Title for ${seriesId}`}
                                                     />
                                                     <Button variant="outline" size="sm" onClick={() => togglePin(seriesId)} className="flex-shrink-0">{pinnedIDs.includes(seriesId) ? "Unpin" : "Pin"}</Button>
                                                 </div>
                                                 {/* Non-editable Subtitle */}
                                                 <p className="text-sm text-gray-600 mb-3">{seriesId}</p>


                                                {/* Slider */}
                                                <div className="mb-3">
                                                    <label htmlFor={`slider-${seriesId}`} className="block text-sm mb-1 font-medium text-gray-700">Date Range</label>
                                                    <Slider.Root
                                                        id={`slider-${seriesId}`}
                                                        value={settings.dateRange}
                                                        // Use the dedicated handler for date range
                                                         onValueChange={(value) => handleDateRangeChange(seriesId, value as [number, number])}
                                                        min={0}
                                                        max={Math.max(0, currentDataLength - 1)} // Use current data length
                                                        step={1}
                                                        minStepsBetweenThumbs={1}
                                                        className="relative flex w-full touch-none items-center select-none"
                                                        aria-label="Date range slider"
                                                        disabled={currentDataLength <= 1} // Disable if only 0 or 1 points
                                                    >
                                                        <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-gray-200"><Slider.Range className="absolute h-full rounded-full bg-primary" /></Slider.Track>
                                                        <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
                                                        <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
                                                    </Slider.Root>
                                                    <div className="flex justify-between text-xs text-gray-600 mt-1 px-1">
                                                         <span>{series.data[settings.dateRange[0]]?.date ?? (currentDataLength > 0 ? series.data[0]?.date : 'Start')}</span>
                                                         <span>{series.data[settings.dateRange[1]]?.date ?? (currentDataLength > 0 ? series.data[currentDataLength - 1]?.date : 'End')}</span>
                                                    </div>
                                                </div>

                                                {/* Customize Button */}
                                                <button type="button" onClick={() => updateChartSetting(seriesId, 'showAdvanced', !settings.showAdvanced)} className="mb-3 underline text-sm text-gray-800 hover:text-gray-900">
                                                    {settings.showAdvanced ? "Hide Customize Chart" : "Customize Chart"}
                                                </button>

                                                {/* Advanced Panel */}
                                                {settings.showAdvanced && (
                                                    <div className="space-y-3 mb-3 border border-gray-100 p-3 rounded bg-gray-50/50">
                                                        {/* Color */}
                                                        <div className="flex items-center gap-2">
                                                            <label htmlFor={`color-${seriesId}`} className="text-sm w-24 shrink-0">Chart Color:</label>
                                                            <input id={`color-${seriesId}`} type="color" value={settings.chartColor} onChange={(e) => updateChartSetting(seriesId, 'chartColor', e.target.value)} className="w-10 h-8 border p-0 cursor-pointer rounded" />
                                                        </div>
                                                        {/* Y Range */}
                                                        <div className="flex items-center flex-wrap gap-2">
                                                            <label className="text-sm w-24 shrink-0">Y Range:</label>
                                                            <Input type="text" placeholder="Min/auto" value={settings.yMin} onChange={(e) => updateChartSetting(seriesId, 'yMin', e.target.value)} className="w-24 h-8 text-sm" aria-label="Y-axis minimum" />
                                                            <Input type="text" placeholder="Max/auto" value={settings.yMax} onChange={(e) => updateChartSetting(seriesId, 'yMax', e.target.value)} className="w-24 h-8 text-sm" aria-label="Y-axis maximum" />
                                                        </div>
                                                        {/* Show Points */}
                                                        <div className="flex items-center gap-2">
                                                            <Switch checked={settings.showPoints} onCheckedChange={(checked) => updateChartSetting(seriesId, 'showPoints', checked)} id={`showPoints-${seriesId}`} />
                                                            <label htmlFor={`showPoints-${seriesId}`} className="text-sm cursor-pointer">Show Points</label>
                                                        </div>
                                                        {/* Second series controls removed */}
                                                    </div>
                                                )}
                                            </div>

                                            {/* --- Section 2: Export Area (Ref attached here) --- */}
                                            <div
                                                className="chart-export-area" // Just a marker, styling comes from children
                                                ref={(el) => {
                                                    // Update ref map
                                                    if (el) chartExportRefs.current.set(seriesId, el);
                                                    else chartExportRefs.current.delete(seriesId);
                                                }}
                                            >
                                                {/* Chart Component (Receives settings via props) */}
                                                <EconomicChart
                                                    fullData={series.data} // Pass the full data
                                                    dateRange={settings.dateRange} // Pass current range
                                                    chartId={settings.title || seriesId} // Pass title or ID for Nivo line ID
                                                    color={settings.chartColor}
                                                    yMin={settings.yMin}
                                                    yMax={settings.yMax}
                                                    showPoints={settings.showPoints}
                                                />
                                                {/* Source Footer (Inside Export Area) */}
                                                <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                                    <span>Visualization by PrettyFRED</span>
                                                    <span>Source: FRED</span>
                                                </div>
                                            </div>

                                            {/* --- Section 3: Export Buttons (Outside Export Area) --- */}
                                            <div className="flex flex-wrap gap-2 mt-auto pt-4"> {/* mt-auto pushes buttons down */}
                                                <Button variant="outline" size="sm" onClick={() => handleExportPng(seriesId)}>Export PNG</Button>
                                                <Button variant="outline" size="sm" onClick={() => handleExportJpg(seriesId)}>Export JPG</Button>
                                                <Button variant="outline" size="sm" onClick={() => handleExportCsv(seriesId)}>Export CSV</Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                        {renderPageSelectionBar()} {/* Bottom Pagination */}
                    </>
                )}

                {/* Modals (Keep as before) */}
                 {showAllSeriesModal && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[80vh] flex flex-col shadow-xl"><h2 className="text-xl font-semibold mb-4 text-gray-800">All Available Series</h2><ul className="flex-grow overflow-y-auto list-disc pl-5 space-y-1 text-sm text-gray-700 border-t border-b py-3 my-2">{FULL_SERIES_LIST.length > 0 ? (FULL_SERIES_LIST.map((s) => (<li key={s.series_id}><strong className="text-gray-900">{s.series_id}</strong> - {s.description}</li>))) : (<li>No series data loaded.</li>)}</ul><Button className="mt-4 self-end" variant="outline" onClick={() => setShowAllSeriesModal(false)}>Close</Button></div></div> )}
                 {showRequestForm && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"><h2 className="text-xl font-semibold mb-4 text-gray-800">Request a Data Series</h2><form onSubmit={handleRequestSubmit} className="space-y-4"><div><label htmlFor="requested_series_id" className="block text-sm font-medium mb-1 text-gray-700">Desired FRED Series ID <span className="text-red-500">*</span></label><Input type="text" id="requested_series_id" name="requested_series_id" required /><p className="text-xs text-gray-500 mt-1">e.g., <a href="https://fred.stlouisfed.org/" target="_blank" rel="noopener noreferrer" className="underline">Find IDs on FRED</a></p></div><div><label htmlFor="notes" className="block text-sm font-medium mb-1 text-gray-700">Notes / Rationale (Optional)</label><textarea id="notes" name="notes" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" rows={3} /></div><div className="flex justify-end gap-2 pt-2"><Button variant="outline" type="button" onClick={() => setShowRequestForm(false)}>Cancel</Button><Button type="submit">Submit Request</Button></div></form></div></div> )}

            </div> {/* End max-w-7xl container */}
        </div> /* End min-h-screen */
    );
}