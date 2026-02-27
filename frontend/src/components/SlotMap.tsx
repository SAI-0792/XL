import React, { useState } from 'react';
import { Slot } from '../types';

interface SlotMapProps {
    slots: Slot[];
    onSlotSelect?: (slot: Slot) => void;
    filterType?: 'CAR' | 'BIKE' | 'TRUCK' | 'HANDICAPPED' | null; // Filter to highlight/enable specific type
}

const SlotMap: React.FC<SlotMapProps> = ({ slots, onSlotSelect, filterType = null }) => {
    const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

    if (!slots || slots.length === 0) {
        return <div className="text-gray-500 text-center py-8">No slots available</div>;
    }

    // Vehicle Type Icon Mapping
    const getVehicleIcon = (type: string) => {
        switch (type) {
            case 'HANDICAPPED': return '♿';
            case 'BIKE': return '🏍️';
            case 'TRUCK': return '🚛';
            case 'CAR': return '🚗';
            default: return '❓';
        }
    };

    // Layout configuration
    // Row 1: y=20 | Row 2: y=50 | Row 3: y=80
    // Aisle 1 (between R1 & R2): y=35
    // Aisle 2 (between R2 & R3): y=65
    const generateTopologicalLayout = (count: number) => {
        const layout: { x: number; y: number; id: string }[] = [];
        slots.forEach((slot, index) => {
            let x, y;
            const slotInRow = index % 6;
            const row = Math.floor(index / 6);

            x = 35 + slotInRow * 10;
            y = 20 + row * 30;

            layout.push({ x, y, id: slot._id });
        });
        return layout;
    };

    const slotLayout = generateTopologicalLayout(slots.length);

    // Precise Manhattan pathing through common aisles
    const getPathForSlot = (targetX: number, targetY: number) => {
        const startX = 10;
        const startY = 50;
        const mainSpineX = 22;

        // Determine which common linking route to use
        let linkingAisleY = 35; // Default between Row 1 and Row 2
        if (targetY > 50) {
            linkingAisleY = 65; // Use aisle between Row 2 and Row 3
        }

        // Route: Entry -> Main Spine -> Linking Aisle -> Turn to Slot
        return `M ${startX} ${startY} L ${mainSpineX} ${startY} L ${mainSpineX} ${linkingAisleY} L ${targetX} ${linkingAisleY} L ${targetX} ${targetY}`;
    };

    // Check if a slot matches the filter type (or if no filter is applied)
    const isSlotMatchingFilter = (slot: Slot) => {
        if (!filterType) return true; // No filter, all slots match
        return slot.type === filterType;
    };

    return (
        <div className="relative w-full aspect-[2/1] bg-[#0c0d12] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] group/map">

            {/* Background Texture */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            {/* Slots Grid */}
            <div className="absolute inset-0 pointer-events-none">
                {slots.map((slot, idx) => {
                    const pos = slotLayout[idx];
                    const matchesFilter = isSlotMatchingFilter(slot);
                    const isAvailable = slot.status === 'AVAILABLE' && matchesFilter;
                    const isOccupied = slot.status === 'OCCUPIED';
                    const isReserved = slot.status === 'RESERVED';
                    const isHovered = hoveredSlot === slot._id && matchesFilter;
                    const isFilteredOut = filterType && !matchesFilter;

                    let statusColor = 'bg-gray-800 border-gray-700';
                    let glowEffect = '';

                    if (isFilteredOut) {
                        // Slot doesn't match filter - show as dimmed
                        statusColor = 'bg-gray-900/50 border-gray-800/50 opacity-30 grayscale';
                    } else if (isAvailable) {
                        statusColor = 'bg-green-600 border-green-400';
                        glowEffect = 'shadow-[0_0_20px_rgba(34,197,94,0.3)]';
                    } else if (isOccupied) {
                        statusColor = 'bg-gray-900 border-white/5 opacity-40 grayscale';
                    } else if (isReserved) {
                        statusColor = 'bg-yellow-600 border-yellow-400 opacity-80';
                    }

                    return (
                        <div
                            key={slot._id}
                            onMouseEnter={() => matchesFilter && setHoveredSlot(slot._id)}
                            onMouseLeave={() => setHoveredSlot(null)}
                            onClick={() => isAvailable && onSlotSelect?.(slot)}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-all duration-300
                                ${isAvailable ? 'cursor-pointer' : 'cursor-default'}
                                ${isHovered ? 'scale-110 -translate-y-2' : ''}
                            `}
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        >
                            <div className={`
                                relative w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all border-2
                                ${statusColor} ${glowEffect}
                            `}>
                                {/* Vehicle Icon */}
                                <span className="text-2xl mt-1 select-none">{getVehicleIcon(slot.type)}</span>

                                {/* Identifier Label */}
                                <div className={`absolute -bottom-5 font-mono text-[9px] font-black tracking-widest text-center w-full
                                    ${isAvailable ? 'text-green-500' : isFilteredOut ? 'text-gray-700' : 'text-gray-500'}
                                `}>
                                    {slot.slotNumber}
                                </div>

                                {/* Slot Type Indicator */}
                                {slot.type === 'HANDICAPPED' && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white flex items-center justify-center">
                                        <span className="text-[6px] text-white">♿</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* SVG Layer (MAX VISIBILITY - highest z-index) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Visual Guide: Background Grid lines (Aisles) */}
                <g stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" fill="none">
                    <path d="M 22 10 L 22 90" strokeWidth="0.8" />
                    <path d="M 22 35 L 94 35" strokeDasharray="1,1" />
                    <path d="M 22 65 L 94 65" strokeDasharray="1,1" />
                </g>

                {/* Animated Wayfinding - ELECTRIFIED NEON */}
                {hoveredSlot && (() => {
                    const targetIdx = slots.findIndex(s => s._id === hoveredSlot);
                    const slot = slots[targetIdx];
                    if (!slot || !isSlotMatchingFilter(slot)) return null;
                    const pos = slotLayout[targetIdx];
                    if (!pos) return null;
                    const pathData = getPathForSlot(pos.x, pos.y);
                    return (
                        <g>
                            {/* Ultra-Glow Base */}
                            <path
                                d={pathData}
                                stroke="#00f2ff"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                                className="opacity-20"
                                style={{ filter: 'blur(6px)' }}
                            />
                            {/* Solid Neon Path */}
                            <path
                                d={pathData}
                                stroke="#00f2ff"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                                className="drop-shadow-[0_0_8px_#00f2ff]"
                            />
                            {/* White Core Lead */}
                            <path
                                d={pathData}
                                stroke="#fff"
                                strokeWidth="0.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                                className="animate-pulse"
                            />

                            {/* Pulse Orbs */}
                            <circle cx="22" cy="50" r="1.5" fill="#fff" className="animate-ping" />
                            <circle cx={pos.x} cy={pos.y} r="2.5" fill="#00f2ff" className="animate-pulse opacity-50" />
                            <circle cx={pos.x} cy={pos.y} r="1.2" fill="#fff" className="shadow-lg shadow-white/50" />
                        </g>
                    );
                })()}
            </svg>

            {/* Entry Station HUD */}
            <div className="absolute top-[50%] left-[6%] -translate-y-1/2 flex flex-col items-center z-20">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] border-4 border-white/20">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                </div>
                <div className="mt-3 flex flex-col items-center">
                    <span className="text-[12px] font-black text-blue-400 tracking-[0.2em] uppercase">Entry</span>
                    <span className="text-[8px] font-mono text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded">ONLINE</span>
                </div>
            </div>

            {/* Exit Gate - HIGHEST CONTRAST */}
            <div className="absolute top-[50%] right-[2%] -translate-y-1/2 flex flex-col items-center z-20">
                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)] border-4 border-white/20">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </div>
                <div className="mt-3 flex flex-col items-center">
                    <span className="text-[12px] font-black text-red-500 tracking-[0.2em] uppercase">Exit</span>
                    <span className="text-[8px] font-mono text-red-100 bg-red-500 px-2 py-0.5 rounded animate-pulse">GATE OPEN</span>
                </div>
            </div>

            {/* Layout Legend */}
            <div className="absolute top-8 right-8 bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/5 flex space-x-6">
                <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-gray-500">♿ Disabled Focus</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-gray-500">🏍️ Bikes</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-gray-500">🚛 Heavy</span>
                </div>
            </div>
        </div>
    );
};

export default SlotMap;
