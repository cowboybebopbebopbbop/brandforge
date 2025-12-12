import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { AppState } from '../store';

export interface UserData {
  tabs: AppState['tabs'];
  activeTabId: string;
  settings: AppState['settings'];
  favoritedNames: AppState['favoritedNames'];
  updatedAt: any;
}

export const saveUserData = async (userId: string, data: Partial<UserData>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

export const syncUserData = async (userId: string, localData: Partial<UserData>) => {
  try {
    const cloudData = await getUserData(userId);
    
    if (!cloudData) {
      // First time user, save local data to cloud
      await saveUserData(userId, localData);
      return localData;
    }
    
    // Cloud data exists, use it (cloud is source of truth when logged in)
    return cloudData;
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
};
