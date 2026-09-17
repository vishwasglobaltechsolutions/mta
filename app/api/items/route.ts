import { NextResponse } from 'next/server';

export interface Item {
  id?: string;
  name: string;
  sku: string;
  upps: number;
  core: number;
  location: string;
  quantity: number;
  size?: string;
  colour?: string;
  position?: string;
  rack?: string;
  row?: string;
}

let mockData: Item[] = [
  { id: "1", name: "DT", sku: "DT-40*50-Y-1-2", size: "40*50mm", colour: "Yellow", upps: 1, core: 2, quantity: 150, location: "RC-R3/F", rack: "C", row: "3", position: "Front(F)" },
  { id: "2", name: "DT", sku: "DT-50*20-G-1-1", size: "50*20mm", colour: "Green", upps: 1, core: 1, quantity: 45, location: "RD-R2/B", rack: "D", row: "2", position: "Back(B)" },
  { id: "3", name: "DT", sku: "DT-100*50-B-1-1", size: "100*50mm", colour: "Black", upps: 1, core: 1, quantity: 5000, location: "RF-R4/B", rack: "F", row: "4", position: "Back(B)" },
];

export async function GET() {
  return NextResponse.json(mockData);
}

export async function POST(request: Request) {
  const item = await request.json();
  const newItem = { id: Math.random().toString(36).substr(2, 9), ...item };
  mockData.push(newItem);
  return NextResponse.json(newItem);
}

export async function PUT(request: Request) {
  const { id, updates } = await request.json();
  const itemIndex = mockData.findIndex(i => i.id === id);
  if (itemIndex > -1) {
    mockData[itemIndex] = { ...mockData[itemIndex], ...updates };
    return NextResponse.json(mockData[itemIndex]);
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  mockData = mockData.filter(i => i.id !== id);
  return NextResponse.json({ success: true });
}
