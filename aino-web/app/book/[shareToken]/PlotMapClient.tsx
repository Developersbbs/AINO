'use client';

import dynamic from 'next/dynamic';
import type { Unit, Project } from './page';

const PlotMapUI = dynamic(() => import('./LayoutMap'), { ssr: false });

interface Props {
  project: Project;
  units: Unit[];
  agentId: string | null;
  shareToken: string;
  backendUrl: string;
}

export default function PlotMapClient(props: Props) {
  return <PlotMapUI {...props} />;
}
