import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHeKoQ8xUYxWtOw0ysagfx5MaHghOP8kE",
  authDomain: "itemtrakinginventoryapp.firebaseapp.com",
  projectId: "itemtrakinginventoryapp",
  storageBucket: "itemtrakinginventoryapp.firebasestorage.app",
  messagingSenderId: "1004819114519",
  appId: "1:1004819114519:web:0f47f7f3503287330b0a52"
};

const hasFirebaseConfig = !!firebaseConfig.projectId;
const app = hasFirebaseConfig ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : null;
export const db = app ? getFirestore(app) : null;

export interface ItemLocation {
  id: string;
  location: string;
  rack: string;
  row: string;
  position: string;
  quantity: number;
}

export interface Item {
  id?: string;
  name: string;
  sku: string;
  upps: number;
  core: number;
  size?: string;
  colour?: string;
  category?: string;
  locations?: ItemLocation[];
  // Backwards compatibility fields
  location?: string;
  quantity?: number;
  position?: string;
  rack?: string;
  row?: string;
}

export interface MovementLog {
  id?: string;
  itemId: string;
  itemName: string;
  sku: string;
  oldQuantity: number;
  newQuantity: number;
  difference: number;
  timestamp: string;
  action: 'add' | 'remove' | 'update';
  location?: string;
  rack?: string;
  row?: string;
  position?: string;
  partyName?: string;
}

export const getItems = async (): Promise<Item[]> => {
  let items: Item[] = [];
  if (db) {
    const querySnapshot = await getDocs(collection(db, "items"));
    items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
  } else {
    const res = await fetch('/api/items');
    items = await res.json();
  }

  // Backwards compatibility mapping
  return items.map(item => {
    if (!item.locations) {
      item.locations = [];
      if (item.location !== undefined) {
        item.locations.push({
          id: 'default',
          location: item.location || '',
          rack: item.rack || '',
          row: item.row || '',
          position: item.position || '',
          quantity: item.quantity || 0
        });
      }
    }
    return item;
  });
};

export const addItem = async (item: Omit<Item, 'id'>): Promise<Item> => {
  if (db) {
    const docRef = await addDoc(collection(db, "items"), item);
    return { id: docRef.id, ...item };
  }

  const res = await fetch('/api/items', {
    method: 'POST',
    body: JSON.stringify(item)
  });
  return res.json();
};

export const getMovements = async (): Promise<MovementLog[]> => {
  if (db) {
    const querySnapshot = await getDocs(collection(db, "movements"));
    const movements = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MovementLog));
    return movements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  const res = await fetch('/api/movements');
  if (res.ok) {
    return res.json();
  }
  return [];
};

export const updateItemQuantity = async (
  id: string,
  updatedLocations: ItemLocation[],
  movementDetails?: { name: string, sku: string, oldQuantity: number, newQuantity: number, difference: number, location?: string, rack?: string, row?: string, position?: string, partyName?: string }
): Promise<void> => {
  if (db) {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, { locations: updatedLocations });

    if (movementDetails && movementDetails.difference !== 0) {
      const movement: MovementLog = {
        itemId: id,
        itemName: movementDetails.name,
        sku: movementDetails.sku,
        oldQuantity: movementDetails.oldQuantity,
        newQuantity: movementDetails.newQuantity,
        difference: movementDetails.difference,
        timestamp: new Date().toISOString(),
        action: movementDetails.difference > 0 ? 'add' : 'remove',
        location: movementDetails.location || '',
        rack: movementDetails.rack || '',
        row: movementDetails.row || '',
        position: movementDetails.position || '',
        partyName: movementDetails.partyName || ''
      };
      await addDoc(collection(db, "movements"), movement);
    }
    return;
  }

  await fetch('/api/items', {
    method: 'PUT',
    body: JSON.stringify({ id, updates: { locations: updatedLocations }, movementDetails })
  });
};

export const updateItem = async (id: string, item: Omit<Item, 'id'>): Promise<void> => {
  if (db) {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, item);
    return;
  }

  await fetch('/api/items', {
    method: 'PUT',
    body: JSON.stringify({ id, updates: item })
  });
};

export const deleteItem = async (id: string): Promise<void> => {
  if (db) {
    await deleteDoc(doc(db, "items", id));
    return;
  }

  await fetch('/api/items', {
    method: 'DELETE',
    body: JSON.stringify({ id })
  });
};
