import React from 'react';

const StackedProgressBar = ({ segments = [], total = 0, isDarkMode = false }) => {
  const totalValue = segments.reduce((s, a) => s + (a.value || 0), 0) || total || 1;

  return (
    <div className="w-full mb-3">
      <div className={`w-full h-3 rounded-full overflow-hidden border ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex h-full">
          {segments.map((seg, idx) => (
            <div
              key={idx}
              title={`${seg.label || ''} ${seg.value || 0}`}
              style={{ width: `${Math.round(((seg.value || 0) / totalValue) * 100)}%` }}
              className={`${seg.color || 'bg-blue-500'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${seg.color || 'bg-blue-500'}`}></div>
            <div className={`${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {seg.label} <span className="text-[11px] text-zinc-400">({seg.value || 0})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StackedProgressBar;
