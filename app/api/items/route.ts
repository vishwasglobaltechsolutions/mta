import { NextResponse } from 'next/server';

export interface Item {
  id?: string;
  name: string;
  sku: string;
  upps: number;
  core: number;
  category: string;
  location: string;
  quantity: number;
  size?: string;
  colour?: string;
}

let mockData: Item[] = [
  { id: "1", name: "Steel Pipes 20mm", sku: "MT-SP-20", size: "20mm", upps: 2, core: 1, category: "Raw Material", location: "Warehouse A, Aisle 3", quantity: 150 },
  { id: "2", name: "Aluminum Sheets", sku: "MT-AS-05", size: "10mm", upps: 1, core: 2, category: "Raw Material", location: "Warehouse B, Rack 2", quantity: 45 },
  { id: "3", name: "Industrial Fasteners", sku: "MT-IF-100", size: "20mm", upps: 3, core: 4, category: "Hardware", location: "Warehouse A, Bin 12", quantity: 5000 },
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
