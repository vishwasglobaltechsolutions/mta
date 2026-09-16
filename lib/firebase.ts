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

export const updateItemQuantity = async (id: string, newQuantity: number): Promise<void> => {
  if (db) {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, { quantity: newQuantity });
    return;
  }

  await fetch('/api/items', {
    method: 'PUT',
    body: JSON.stringify({ id, updates: { quantity: newQuantity } })
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
