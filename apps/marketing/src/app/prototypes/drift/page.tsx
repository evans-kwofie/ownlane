import type { Metadata } from 'next';
import { DriftConcepts } from '@/components/drift-concepts';

export const metadata: Metadata = {
  title: 'Drift section concepts',
  robots: { index: false, follow: false },
};

export default function DriftPrototypePage() {
  return <DriftConcepts />;
}
