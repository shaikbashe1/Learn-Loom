import { AppLayout } from '@/components/layouts/AppLayout';
import { AIMentorChat } from '@/components/chat/AIMentorChat';

export default function AIMentorPage() {
  return (
    <AppLayout title="AI Mentor">
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden w-full relative">
        <AIMentorChat />
      </div>
    </AppLayout>
  );
}
