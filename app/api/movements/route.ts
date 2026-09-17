import { NextResponse } from 'next/server';

let mockMovements: any[] = [
  {
    id: "m1",
    itemId: "1",
    itemName: "Steel Pipes 20mm",
    sku: "MT-SP-20",
    oldQuantity: 100,
    newQuantity: 150,
    difference: 50,
    timestamp: new Date().toISOString(),
    action: "add"
  }
];

export async function GET() {
  return NextResponse.json(mockMovements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
}
