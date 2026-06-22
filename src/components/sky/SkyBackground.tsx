import React, { useEffect, useState } from 'react';
import { useShift } from '@/context/ShiftContext';

export const SkyBackground: React.FC = () => {
  const { currentLocalMinutes } = useShift();
  const [gradient, setGradient] = useState('');

  useEffect(() => {
    const hour = currentLocalMinutes / 60;
    if (hour >= 5 && hour < 8) {
      // Sunrise
      setGradient('linear-gradient(to bottom, #1a1a2e 0%, #e8613c 30%, #f7c59f 60%, #ffe4b5 100%)');
    } else if (hour >= 8 && hour < 16) {
      // Daytime
      setGradient('linear-gradient(to bottom, #0ea5e9 0%, #38bdf8 40%, #bae6fd 80%, #f0f9ff 100%)');
    } else if (hour >= 16 && hour < 19) {
      // Sunset
      setGradient('linear-gradient(to bottom, #312e81 0%, #7c3aed 20%, #db2777 50%, #f97316 75%, #fbbf24 100%)');
    } else {
      // Night
      setGradient('linear-gradient(to bottom, #0f172a 0%, #1e1b4b 30%, #312e81 60%, #1e3a5f 100%)');
    }
  }, [currentLocalMinutes]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        background: gradient,
        transition: 'background 3s ease',
      }}
    >
      {/* Clouds could be added here */}
    </div>
  );
};
