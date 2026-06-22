import React from 'react';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { GlossaryFab } from '@/components/glossary/GlossaryFab';
import { PerformanceReport } from '@/components/report/PerformanceReport';

export default function Report() {
  return (
    <>
      <SkyBackground />
      <div className="min-h-screen p-8 overflow-auto font-mono flex justify-center items-start">
        <div className="max-w-4xl w-full">
          <PerformanceReport />
        </div>
      </div>
      <GlossaryFab />
    </>
  );
}
