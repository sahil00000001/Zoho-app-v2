'use client';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

// Pages that should get full width/height (no max-w, no padding, no scroll wrapper)
const FULL_BLEED_ROUTES = ['/dashboard/org-chart'];

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isFullBleed = FULL_BLEED_ROUTES.some(r => path.startsWith(r));

  if (isFullBleed) {
    return <div className="flex-1 h-full w-full overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-5 md:p-6 max-w-7xl mx-auto flex flex-col min-h-full">
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
