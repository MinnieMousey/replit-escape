import React from 'react';
import { useShift } from '@/context/ShiftContext';
import { TaskCard } from './TaskCard';
import { ScrollArea } from '@/components/ui/scroll-area';

export const TaskQueue: React.FC = () => {
  const { tasks } = useShift();
  
  const pendingTasks = tasks
    .filter(t => t.status === 'PENDING')
    .sort((a, b) => a.expiresAt - b.expiresAt);

  return (
    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-black/10">
        <h2 className="text-white font-bold text-lg">Task Queue ({pendingTasks.length}/12)</h2>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {pendingTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {pendingTasks.length === 0 && (
            <div className="text-white/50 text-center py-8">
              No pending tasks
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
