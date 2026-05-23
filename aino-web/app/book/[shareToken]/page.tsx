import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import TrackClick from './TrackClick';

const PlotMapUI = dynamic(() => import('./LayoutMap'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitStatus = 'Available' | 'Booked' | 'Sold';

export interface Unit {
  id: string;
  unit_number: string;
  sq_ft: number;
  price: number;
  facing: string | null;
  road_width: number | null;
  status: UnitStatus;
  coordinates: { x: number; y: number; w: number; h: number } | null;
  attributes: Record<string, unknown> | null;
}

export interface Project {
  name: string;
  type: string;
  location: string;
  reraNumber: string | null;
  configAttributes: Record<string, string> | null;
  layoutImageUrl: string | null;
  documents: { name: string; url: string; type: 'pdf' | 'image'; uploadedAt: string }[];
}

interface PageData {
  agentId: string | null;
  project: Project;
  units: Unit[];
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchData(shareToken: string): Promise<PageData | null> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001/api';
  try {
    const res = await fetch(`${apiUrl}/leads/public/${shareToken}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as PageData;
  } catch {
    return null;
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ shareToken: string }> },
): Promise<Metadata> {
  const { shareToken } = await params;
  const data = await fetchData(shareToken);
  if (!data) return { title: 'Project — AINO' };
  return {
    title: `${data.project.name} — AINO`,
    description: `${data.project.type} in ${data.project.location}. View & book available plots.`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BookPage(
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params;
  const data = await fetchData(shareToken);
  if (!data) notFound();

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

  return (
    <>
      <TrackClick shareToken={shareToken} />
      <PlotMapUI
        project={data.project}
        units={data.units}
        agentId={data.agentId ?? null}
        shareToken={shareToken}
        backendUrl={backendUrl}
      />
    </>
  );
}
