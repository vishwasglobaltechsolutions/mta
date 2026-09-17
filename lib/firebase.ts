import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const hasFirebaseConfig = !!firebaseConfig.projectId;
const app = hasFirebaseConfig ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : null;
export const db = app ? getFirestore(app) : null;

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
  category?: string;
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
}

export const getItems = async (): Promise<Item[]> => {
  if (db) {
    const querySnapshot = await getDocs(collection(db, "items"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
  }

  const res = await fetch('/api/items');
  return res.json();
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

export const updateItemQuantity = async (id: string, newQuantity: number, itemDetails?: { name: string, sku: string, oldQuantity: number, location?: string, rack?: string, row?: string, position?: string }): Promise<void> => {
  if (db) {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, { quantity: newQuantity });

    if (itemDetails) {
      const difference = newQuantity - itemDetails.oldQuantity;
      if (difference !== 0) {
        const movement: MovementLog = {
          itemId: id,
          itemName: itemDetails.name,
          sku: itemDetails.sku,
          oldQuantity: itemDetails.oldQuantity,
          newQuantity: newQuantity,
          difference,
          timestamp: new Date().toISOString(),
          action: difference > 0 ? 'add' : 'remove',
          location: itemDetails.location || '',
          rack: itemDetails.rack || '',
          row: itemDetails.row || '',
          position: itemDetails.position || ''
        };
        await addDoc(collection(db, "movements"), movement);
      }
    }
    return;
  }

  await fetch('/api/items', {
    method: 'PUT',
    body: JSON.stringify({ id, updates: { quantity: newQuantity }, movementDetails: itemDetails })
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
