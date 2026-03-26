'use client';
import { usePathname } from 'next/navigation';

// Pages that should get full width/height (no max-w, no padding, no scroll wrapper)
const FULL_BLEED_ROUTES = ['/dashboard/org-chart'];

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isFullBleed = FULL_BLEED_ROUTES.some(r => path.startsWith(r));

  if (isFullBleed) {
    // Full width, full height — org chart fills the entire main area
    return <div className="flex-1 h-full w-full overflow-hidden">{children}</div>;
  }

  // Standard pages: padded, max-width, scrollable
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-5 md:p-6 max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
