'use client';

import React, { useState } from 'react';
import { Sliders, HelpCircle, Layers } from 'lucide-react';

export function SubnetSimulator() {
  const [cidr, setCidr] = useState(26);

  const calculateSubnet = (maskBits: number) => {
    const totalIPs = Math.pow(2, 32 - maskBits);
    const usableIPs = maskBits <= 30 ? totalIPs - 2 : 0;
    
    // Simple mock octet calculator
    let mask = '255.255.255.0';
    if (maskBits === 24) mask = '255.255.255.0';
    if (maskBits === 25) mask = '255.255.255.128';
    if (maskBits === 26) mask = '255.255.255.192';
    if (maskBits === 27) mask = '255.255.255.224';
    if (maskBits === 28) mask = '255.255.255.240';
    if (maskBits === 29) mask = '255.255.255.248';
    if (maskBits === 30) mask = '255.255.255.252';

    return { mask, totalIPs, usableIPs };
  };

  const { mask, totalIPs, usableIPs } = calculateSubnet(cidr);

  // Divide visual /24 block into subnet segments based on CIDR
  const segmentsCount = Math.pow(2, cidr - 24);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 my-6 relative overflow-hidden shadow-lg select-none font-sans">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h4 className="text-sm font-bold text-white tracking-tight">Interactive VLSM Subnet Simulator</h4>
        </div>
        <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Networking Lab
        </span>
      </div>

      <p className="text-slate-400 text-xs leading-relaxed mb-6">
        Drag the slider below to divide a standard Class C block (<code>192.168.1.0/24</code>) into classless subnets. Note how mask addresses grow as host sizes shrink.
      </p>

      {/* Slider Control */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-500">SUBNET PREFIX LENGTH</span>
          <span className="text-indigo-400 font-mono text-sm font-bold">/{cidr}</span>
        </div>
        <input
          type="range"
          min="24"
          max="30"
          value={cidr}
          onChange={(e) => setCidr(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-slate-600 font-bold font-mono">
          <span>/24 (256 IPs)</span>
          <span>/27 (32 IPs)</span>
          <span>/30 (4 IPs)</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Subnet Mask</span>
          <span className="text-slate-200 font-mono text-xs font-bold">{mask}</span>
        </div>
        <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total IPs</span>
          <span className="text-slate-200 font-mono text-xs font-bold">{totalIPs}</span>
        </div>
        <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Usable Hosts</span>
          <span className="text-indigo-400 font-mono text-xs font-bold">{usableIPs}</span>
        </div>
      </div>

      {/* Visual Block Segments Splitter */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Subnet Segments Distribution ({segmentsCount} subnets)</span>
        </div>
        <div className="h-6 w-full bg-slate-950 rounded-xl overflow-hidden p-1 flex gap-1 border border-slate-850">
          {Array.from({ length: Math.min(segmentsCount, 32) }).map((_, idx) => (
            <div
              key={idx}
              className="h-full flex-1 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-sm opacity-90 hover:opacity-100 transition-opacity cursor-help relative group"
              title={`Subnet #${idx + 1}`}
            />
          ))}
          {segmentsCount > 32 && (
            <div className="h-full flex-1 bg-slate-800 rounded-sm flex items-center justify-center text-[8px] text-slate-400 font-bold">
              +32
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
