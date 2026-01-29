import { createContext, useContext } from 'react';

interface UseProStatusReturn {
  isPro: boolean;
  loading: boolean;
}

// Context để share Pro status giữa các components
const ProContext = createContext<UseProStatusReturn | null>(null);

export function ProProvider({ children }: { children: React.ReactNode }) {
  // Always return isPro: true - no Pro restrictions
  const proStatus = { isPro: true, loading: false };
  return <ProContext.Provider value={proStatus}>{children}</ProContext.Provider>;
}

export function useProStatus(): UseProStatusReturn {
  const context = useContext(ProContext);
  if (context) return context;
  
  // Always return isPro: true - no Pro restrictions
  return { isPro: true, loading: false };
}

// Simplified ProFeature - always shows children
interface ProFeatureProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature?: string;
  description?: string;
}

export function ProFeature({ children }: ProFeatureProps) {
  return <>{children}</>;
}

// ProBadge - no longer displays anything
export function ProBadge() {
  return null;
}

// ProRequiredBadge - no longer displays anything  
export function ProRequiredBadge() {
  return null;
}

// ProLockedScreen - no longer needed, just close if called
interface ProLockedScreenProps {
  feature?: string;
  description?: string;
  onClose?: () => void;
}

export function ProLockedScreen({ onClose }: ProLockedScreenProps) {
  // Auto close if this is somehow rendered
  if (onClose) onClose();
  return null;
}
