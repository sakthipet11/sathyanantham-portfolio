import { LoadingFallback } from '@/components/ui/LoadingFallback';

export default function Loading() {
  return (
    <div className="flex min-h-[75vh] w-full items-center justify-center p-6">
      <LoadingFallback label="Initializing Sathyanantham AI Studio..." />
    </div>
  );
}
