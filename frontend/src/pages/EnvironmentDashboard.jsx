import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Sun, Thermometer, Wind, Droplet, Cloud, AlertTriangle, Activity,
    MapPin, TrendingUp, Download, Share2, Bookmark, RefreshCw,
    Eye, Heart, Shield, Settings, Calendar, Clock,
    ChevronRight, ChevronDown, Info, Zap, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const POLLUTANT_META = {
    co: { label: "CO", unit: "mg/m³", icon: Activity, thresholds: [4, 9, 12, 15] },
    pm25: { label: "PM2.5", unit: "µg/m³", icon: Activity, thresholds: [12, 35.4, 55.4, 150.4] },
    pm10: { label: "PM10", unit: "µg/m³", icon: Activity, thresholds: [54, 154, 254, 354] },
    no2: { label: "NO₂", unit: "ppb", icon: Activity, thresholds: [53, 100, 360, 649] },
    o3: { label: "O₃", unit: "ppb", icon: Activity, thresholds: [54, 70, 85, 105] },
    so2: { label: "SO₂", unit: "ppb", icon: Activity, thresholds: [35, 75, 185, 304] },
    dew: { label: "Dew Point", unit: "°C", icon: Droplet },
    h: { label: "Humidity", unit: "%", icon: Droplet },
    p: { label: "Pressure", unit: "hPa", icon: Activity },
    t: { label: "Temperature", unit: "°C", icon: Thermometer },
    w: { label: "Wind Speed", unit: "m/s", icon: Wind },
    wd: { label: "Wind Dir", unit: "°", icon: Wind },
    wg: { label: "Wind Gust", unit: "m/s", icon: Wind },
};

function getCategoryAndColor(value, meta) {
    if (!meta || !meta.thresholds) return { cat: "—", color: "bg-gray-200" };
    const t = meta.thresholds;
    if (value <= t[0]) return { cat: "Good", color: "bg-green-400" };
    if (value <= t[1]) return { cat: "Moderate", color: "bg-yellow-400" };
    if (value <= t[2]) return { cat: "Unhealthy (S)", color: "bg-orange-400" };
    if (value <= t[3]) return { cat: "Unhealthy", color: "bg-red-500" };
    return { cat: "Hazardous", color: "bg-purple-700" };
}

export default function EnvironmentDashboard() {
    const [data, setData] = useState(null);
    const [city, setCity] = useState("");
    const [showGuide, setShowGuide] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [expandedCard, setExpandedCard] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [showHealthTips, setShowHealthTips] = useState(false);

    const fetchUrl = import.meta.env.VITE_BACKEND_URL;

    const fetchData = async () => {
        if (!city.trim()) {
            setError("Please enter a city name");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await axios(`${fetchUrl}/environment?city=${encodeURIComponent(city)}`);
            setData(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
            setError("Failed to fetch data. Please check if the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh functionality
    useEffect(() => {
        let interval;
        if (autoRefresh && city) {
            interval = setInterval(fetchData, 300000); 
        }
        return () => clearInterval(interval);
    }, [autoRefresh, city]);

    // Add to favorites
    const toggleFavorite = () => {
        if (!city) return;

        setFavorites(prev => {
            const isAlreadyFavorite = prev.includes(city);
            if (isAlreadyFavorite) {
                return prev.filter(fav => fav !== city);
            } else {
                return [...prev, city];
            }
        });
    };

    // Download data as JSON
    const downloadData = () => {
        if (!data) return;

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `environment-data-${city}-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Share functionality
    const shareData = async () => {
        if (!data) return;

        const shareText = `Air Quality in ${city}: AQI ${data.aqi_data?.aqi_us}, Temperature: ${formatValue(data.weather_data?.temperature)}°C`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Environment Data',
                    text: shareText,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText);
            alert('Data copied to clipboard!');
        }
    };

    // Get health recommendations based on AQI
    const getHealthRecommendations = (aqi) => {
        if (!aqi) return [];

        if (aqi <= 50) return [
            "Air quality is excellent! Great time for outdoor activities.",
            "Perfect conditions for exercise and sports.",
            "Windows can be kept open for natural ventilation."
        ];

        if (aqi <= 100) return [
            "Air quality is moderate. Sensitive individuals should be cautious.",
            "Consider reducing prolonged outdoor exertion.",
            "Close windows during high traffic hours."
        ];

        if (aqi <= 150) return [
            "Unhealthy for sensitive groups. Limit outdoor activities.",
            "Use air purifiers indoors.",
            "Wear masks when going outside."
        ];

        return [
            "Air quality is unhealthy. Avoid outdoor activities.",
            "Keep windows closed and use air purifiers.",
            "Consider staying indoors, especially children and elderly.",
            "Use N95 masks if you must go outside."
        ];
    };

    // small helpers
    const prettyKey = (k) => POLLUTANT_META[k]?.label || k.toUpperCase();
    const unitFor = (k) => POLLUTANT_META[k]?.unit || "";
    const formatValue = (value) => {
        if (value === null || value === undefined || value === "—") return "—";
        const num = parseFloat(value);
        return isNaN(num) ? "—" : num.toFixed(2);
    };

    return (
        <div className="min-h-screen w-full p-4 md:p-6 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 text-slate-100">
            <div className="max-w-7xl mx-auto">
                {/* Enhanced Header */}
                <header className="relative mb-12 overflow-hidden">
                    {/* Animated Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-indigo-900/30 rounded-2xl blur-xl opacity-60"></div>
                    <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl animate-pulse delay-1000"></div>

                    {/* Main Header Container */}
                    <div className="relative z-10 bg-slate-800/30 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-6 md:p-8 shadow-2xl">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

                            {/* Title Section */}
                            <div className="flex-1">
                                <div className="flex flex-col gap-6">
                                    {/* Main Title with Icon */}
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
                                            <Globe className="relative w-14 h-14 text-white drop-shadow-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-purple-700 rounded-full p-3 shadow-lg shadow-purple-500/50" />
                                        </div>
                                        <div>
                                            <h1 className="p-2 text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-blue-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-2xl">
                                                दुनिया मौसम
                                            </h1>
                                            <hr className="h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-fuchsia-400 rounded-full my-2 shadow-md" />

                                            <div className="text-sm md:text-base text-slate-300 font-medium">
                                                Real-time Climate Intelligence Platform
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Controls Section */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:ml-8">

                                {/* Control Buttons Row */}
                                <div className="flex items-center gap-3">
                                    {/* Auto-refresh toggle */}
                                    <button
                                        onClick={() => setAutoRefresh(!autoRefresh)}
                                        className={`p-3 rounded-xl transition-all duration-300 shadow-lg transform hover:scale-105 ${autoRefresh
                                                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/50 shadow-green-500/30 hover:shadow-green-500/50'
                                                : 'bg-slate-700/50 hover:bg-slate-700/70 border border-slate-500/50 text-slate-300 hover:text-white shadow-slate-500/20'
                                            }`}
                                        title="Auto-refresh every 5 minutes"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
                                    </button>

                                    {/* Guide Toggle */}
                                    <button
                                        onClick={() => setShowGuide(!showGuide)}
                                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 border border-purple-400/50 flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 transform hover:scale-105"
                                    >
                                        <Info className="w-4 h-4 text-purple-300" />
                                        <span className="text-white font-medium">{showGuide ? "Hide Guide" : "Show Guide"}</span>
                                    </button>
                                </div>

                                {/* Search Section */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity"></div>
                                    <div className="relative flex items-center gap-2 bg-slate-800/50 backdrop-blur-lg rounded-xl p-3 border border-slate-500/50 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300">
                                        <input
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && fetchData()}
                                            placeholder="Enter city name..."
                                            className="bg-transparent outline-none placeholder:text-slate-400 px-3 py-1 w-52 text-white font-medium focus:placeholder:text-slate-500 transition-colors"
                                        />
                                        <button
                                            onClick={fetchData}
                                            disabled={loading}
                                            className="px-5 py-2 bg-gradient-to-r from-blue-500 via-purple-600 to-fuchsia-500 hover:from-blue-600 hover:via-purple-700 hover:to-fuchsia-600 rounded-lg transition-all duration-300 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:scale-105 font-semibold"
                                        >
                                            {loading ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Zap className="w-4 h-4 text-yellow-300 drop-shadow-lg" />
                                                    <span className="text-white">Analyze</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div>
                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3"
                            >
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                <span className="text-red-200">{error}</span>
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-auto text-red-400 hover:text-red-300"
                                >
                                    ×
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Data Display */}
                    {data && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6" >
                            {/* Status Bar */}
                            <div className="flex flex-wrap items-center justify-between p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-600/50">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-sm text-slate-300">Live Data</span>
                                    </div>

                                    {lastUpdated && (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Clock className="w-4 h-4" />
                                            Updated {lastUpdated.toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleFavorite}
                                        className={`p-2 rounded-lg transition ${favorites.includes(city)
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-slate-700/50 hover:bg-slate-700/70'
                                            }`}
                                        title="Add to favorites"
                                    >
                                        <Bookmark className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={downloadData}
                                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 transition"
                                        title="Download data"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={shareData}
                                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 transition"
                                        title="Share data"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center p-4 gap-3">
                                {/* Critical Messages */}
                                {/* English Statement */}
                                <div className="relative p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-l-4 border-red-400 rounded-lg backdrop-blur-sm">
                                <p className="font-bold text-red-300 text-base md:text-xl leading-relaxed">
                                    Climate crisis at its peak — while world leaders are sleeping,<br className="hidden md:block" />
                                    ignoring the very disaster they created. "HYPOCRITES"
                                </p>
                                </div>

                                {/* Hindi Statement */}
                                <div className="relative p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-l-4 border-red-400 rounded-lg backdrop-blur-sm">
                                <p className="font-bold text-red-300 text-base md:text-xl leading-relaxed">
                                    जलवायु संकट चरम पर है — और वैश्विक नेता सो रहे हैं,<br className="hidden md:block" />
                                    उसी तबाही से मुँह मोड़े जिसे उन्होंने ही पैदा किया। "पाखंडी"
                                </p>
                                </div>
                            </div>
                            <div className="relative p-4 flex gap-4 bg-gradient-to-r from-blue-500/10 to-teal-500/10 border-l-4 border-blue-400 rounded-lg backdrop-blur-sm">
                                <a 
                                    href="https://unfccc.int/process-and-meetings/the-paris-agreement"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-blue-300 text-base md:text-lg hover:text-blue-200 transition-colors duration-300 underline decoration-blue-400/50 hover:decoration-blue-300 underline-offset-4"
                                >
                                    Paris Agreement?
                                </a>
                                <a 
                                    href="https://acharyaprashant.org/en/articles/operation-2030-on-climate-change-1_619e5b9"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-teal-300 text-base md:text-lg hover:text-teal-200 transition-colors duration-300 underline decoration-teal-400/50 hover:decoration-teal-300 underline-offset-4"
                                >
                                    Operation 2030: Confronting The Climate Crisis Within
                                </a>
                            </div>

                            {/* Main Grid Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-3 bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-6 shadow-2xl">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                                <MapPin className="w-6 h-6 text-blue-400" />
                                                {data?.city || "Unknown Location"}
                                            </h2>
                                            <p className="text-slate-300 mt-1">Air Quality Index — US EPA Standard</p>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                                {data?.aqi_data?.aqi_us ?? "—"}
                                            </div>
                                            <div className="text-sm text-slate-300 mt-1">AQI (US EPA)</div>
                                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${getCategoryAndColor(data?.aqi_data?.aqi_us, { thresholds: [50, 100, 150, 200] }).color
                                                } text-black`}>
                                                {getCategoryAndColor(data?.aqi_data?.aqi_us, { thresholds: [50, 100, 150, 200] }).cat}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Stats Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        <div className="p-4 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
                                            <div className="flex items-center gap-3">
                                                <Thermometer className="w-8 h-8 text-blue-400" />
                                                <div>
                                                    <div className="text-2xl font-bold text-white">{formatValue(data?.aqi_data?.pollutants?.t)}°C</div>
                                                    <div className="text-xs text-blue-200">Temperature</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 rounded-xl border border-cyan-500/30">
                                            <div className="flex items-center gap-3">
                                                <Droplet className="w-8 h-8 text-cyan-400" />
                                                <div>
                                                    <div className="text-2xl font-bold text-white">{formatValue(data?.aqi_data?.pollutants?.h)}%</div>
                                                    <div className="text-xs text-cyan-200">Humidity</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-xl border border-green-500/30">
                                            <div className="flex items-center gap-3">
                                                <Wind className="w-8 h-8 text-green-400" />
                                                <div>
                                                    <div className="text-2xl font-bold text-white">{formatValue(data?.aqi_data?.pollutants?.w)} m/s</div>
                                                    <div className="text-xs text-green-200">Wind Speed</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-xl border border-purple-500/30">
                                            <div className="flex items-center gap-3">
                                                <Activity className="w-8 h-8 text-purple-400" />
                                                <div>
                                                    <div className="text-2xl font-bold text-white">{formatValue(data?.aqi_data?.pollutants?.p)}</div>
                                                    <div className="text-xs text-purple-200">Pressure (hPa)</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dominant Pollutant Alert */}
                                    {data?.aqi_data?.dominant_pollutant && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="mb-6 p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl"
                                        >
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="w-6 h-6 text-orange-400" />
                                                <div>
                                                    <div className="font-semibold text-white">Dominant Pollutant</div>
                                                    <div className="text-orange-200">
                                                        {prettyKey(data.aqi_data.dominant_pollutant)} is the primary concern in your area
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Detailed Pollutants */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-white">Detailed Pollutant Analysis</h3>
                                            <button
                                                onClick={() => setShowHealthTips(!showHealthTips)}
                                                className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition text-blue-300"
                                            >
                                                <Heart className="w-4 h-4" />
                                                Health Tips
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {data && Object.entries(data.aqi_data.pollutants).map(([k, v]) => {
                                                const meta = POLLUTANT_META[k];
                                                const label = prettyKey(k);
                                                const unit = unitFor(k);
                                                const catObj = getCategoryAndColor(Number(v), meta);
                                                const maxValue = meta?.thresholds?.[3] || 100;
                                                const widthPct = Math.min(100, Math.round((Number(v) / maxValue) * 100));

                                                return (
                                                    <motion.div
                                                        key={k}
                                                        layout
                                                        whileHover={{ scale: 1.02 }}
                                                        className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-600/50 hover:border-slate-500/70 transition-all cursor-pointer"
                                                        onClick={() => setExpandedCard(expandedCard === k ? null : k)}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                                                                    {meta?.icon ? React.createElement(meta.icon, { size: 20, className: "text-blue-400" }) : <Cloud size={20} className="text-blue-400" />}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-white">{label}</div>
                                                                    <div className="text-sm text-slate-300">{formatValue(v)} {unit}</div>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${catObj.color} text-black`}>
                                                                    {catObj.cat}
                                                                </div>
                                                                <div className="mt-1">
                                                                    {expandedCard === k ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="mb-3 bg-slate-700/30 h-2 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${widthPct}%` }}
                                                                transition={{ duration: 1, delay: 0.1 }}
                                                                className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                                                            />
                                                        </div>

                                                        {/* Expanded Information */}
                                                        <AnimatePresence>
                                                            {expandedCard === k && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="text-sm text-slate-300 border-t border-slate-600/50 pt-3"
                                                                >
                                                                    <div className="space-y-2">
                                                                        <div>Current: <span className="font-semibold text-white">{formatValue(v)} {unit}</span></div>
                                                                        {meta?.thresholds && (
                                                                            <div className="space-y-1">
                                                                                <div>Safe level: ≤ {formatValue(meta.thresholds[0])} {unit}</div>
                                                                                <div>Moderate: {formatValue(meta.thresholds[0] + 1)}-{formatValue(meta.thresholds[1])} {unit}</div>
                                                                                <div>Unhealthy: ≥ {formatValue(meta.thresholds[2])} {unit}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Sidebar */}
                                <aside className="lg:col-span-1 space-y-6">{/* Weather Card */}
                                    <motion.div
                                        className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 shadow-lg"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <div className="text-sm text-blue-200">Current Weather</div>
                                                <div className="text-xl font-semibold text-white mt-1 capitalize">{data?.weather_data?.weather ?? "—"}</div>
                                            </div>
                                        </div>

                                        <div className="text-center mb-4">
                                            <div className="text-4xl font-bold text-white">{formatValue(data?.weather_data?.temperature)}°C</div>
                                            <div className="text-sm text-blue-200">Feels like {formatValue(data?.weather_data?.temperature)}°C</div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                                                <span className="text-sm text-slate-300">Humidity</span>
                                                <span className="font-semibold text-white">{formatValue(data?.weather_data?.humidity)}%</span>
                                            </div>
                                            <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                                                <span className="text-sm text-slate-300">Wind</span>
                                                <span className="font-semibold text-white">{formatValue(data?.aqi_data?.pollutants?.w)} m/s</span>
                                            </div>
                                            <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                                                <span className="text-sm text-slate-300">Pressure</span>
                                                <span className="font-semibold text-white">{formatValue(data?.aqi_data?.pollutants?.p)} hPa</span>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Health Recommendations */}
                                    <AnimatePresence>
                                        {showHealthTips && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                className="p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-sm border border-green-500/30 shadow-lg"
                                            >
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Heart className="w-6 h-6 text-green-400" />
                                                    <h3 className="text-lg font-semibold text-white">Health Recommendations</h3>
                                                </div>

                                                <div className="space-y-3">
                                                    {getHealthRecommendations(data?.aqi_data?.aqi_us).map((tip, index) => (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.1 }}
                                                            className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                                                        >
                                                            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                                                            <span className="text-sm text-slate-200">{tip}</span>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Quick Actions */}
                                    <motion.div
                                        className="p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-sm border border-slate-600/50 shadow-lg"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
                                    >
                                        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>

                                        <div className="space-y-3">
                                            <button
                                                onClick={() => setShowHealthTips(!showHealthTips)}
                                                className="w-full flex items-center gap-3 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition text-left"
                                            >
                                                {/* <Lungs className="w-5 h-5 text-blue-400" /> */}
                                                <span className="text-white">Health Guidelines</span>
                                            </button>

                                            <button
                                                onClick={downloadData}
                                                className="w-full flex items-center gap-3 p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition text-left"
                                            >
                                                <Download className="w-5 h-5 text-purple-400" />
                                                <span className="text-white">Export Data</span>
                                            </button>

                                            <button
                                                onClick={shareData}
                                                className="w-full flex items-center gap-3 p-3 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition text-left"
                                            >
                                                <Share2 className="w-5 h-5 text-green-400" />
                                                <span className="text-white">Share Report</span>
                                            </button>
                                        </div>
                                    </motion.div>

                                    {/* Favorites */}
                                    {favorites.length > 0 && (
                                        <motion.div
                                            className="p-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-sm border border-yellow-500/30 shadow-lg"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0, transition: { delay: 0.3 } }}
                                        >
                                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                                <Bookmark className="w-5 h-5 text-yellow-400" />
                                                Favorites
                                            </h3>

                                            <div className="space-y-2">
                                                {favorites.map((favCity, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            setCity(favCity);
                                                            fetchData();
                                                        }}
                                                        className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-lg transition text-sm text-slate-200"
                                                    >
                                                        {favCity}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </aside>
                            </div>
                        </motion.div>
                    )}

                    {/* Enhanced Guide Panel */}
                    <AnimatePresence>
                        {showGuide && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-sm border border-slate-600/50 shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <Shield className="w-6 h-6 text-blue-400" />
                                        Environmental Intelligence Guide
                                    </h3>
                                    <button
                                        onClick={() => setShowGuide(false)}
                                        className="text-slate-400 hover:text-white transition"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-blue-400 flex items-center gap-2">
                                            <Eye className="w-5 h-5" />
                                            Understanding AQI
                                        </h4>
                                        <div className="space-y-3 text-sm text-slate-300">
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 bg-green-400 rounded"></div>
                                                <span><strong>0-50 Good:</strong> Air quality is excellent</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                                                <span><strong>51-100 Moderate:</strong> Some sensitivity possible</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 bg-orange-400 rounded"></div>
                                                <span><strong>101-150 Unhealthy (S):</strong> Sensitive groups affected</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 bg-red-500 rounded"></div>
                                                <span><strong>151-200 Unhealthy:</strong> Everyone affected</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 bg-purple-700 rounded"></div>
                                                <span><strong>201+ Hazardous:</strong> Emergency conditions</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-green-400 flex items-center gap-2">
                                            <Heart className="w-5 h-5" />
                                            Health Protection
                                        </h4>
                                        <div className="space-y-2 text-sm text-slate-300">
                                            <p>• Use N95 masks when AQI {'>'}100</p>
                                            <p>• Avoid outdoor exercise when AQI {'>'}150</p>
                                            <p>• Keep windows closed on high pollution days</p>
                                            <p>• Use air purifiers indoors</p>
                                            <p>• Stay hydrated and eat antioxidant-rich foods</p>
                                            <p>• Monitor children and elderly closely</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-purple-400 flex items-center gap-2">
                                            <Settings className="w-5 h-5" />
                                            Advanced Features
                                        </h4>
                                        <div className="space-y-2 text-sm text-slate-300">
                                            <p>• Click pollutant cards for detailed info</p>
                                            <p>• Enable auto-refresh for live monitoring</p>
                                            <p>• Save favorite locations for quick access</p>
                                            <p>• Export data for analysis</p>
                                            <p>• Share reports with family/friends</p>
                                            <p>• Get location-based recommendations</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                                        <div className="text-sm text-blue-200">
                                            <strong>Disclaimer:</strong> This tool provides educational information based on publicly available data.
                                            For medical decisions or official health advisories, always consult local health authorities and medical professionals.
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* Footer */}
                <footer className="mt-8 text-center text-sm text-slate-400 border-t border-slate-800 pt-6">
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <span>Powered by दुनिया मौसम</span>
                        <span>•</span>
                        <span>Data updates every 5 minutes</span>
                        <span>•</span>
                        <span>Built with ❤️ for Environmental Awareness</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}