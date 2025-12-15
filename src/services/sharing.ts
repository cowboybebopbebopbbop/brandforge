import { 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import { TabData, GeneratedName } from '../store';

// Share link types
export type SharePermission = 'view' | 'comment' | 'edit';
export type ShareType = 'favorites-only' | 'full-project';

export interface ShareLink {
  id: string;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  shareType: ShareType;  // What content to show
  permission: SharePermission;  // What actions are allowed
  createdAt: any;
  expiresAt?: any;
  accessCount: number;
  isActive: boolean;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  nameId: string;  // ID of the name being commented on
  nameName: string; // The actual name text
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: any;
  updatedAt?: any;
  parentId?: string; // For threaded comments
  reactions?: {
    [userId: string]: 'like' | 'heart' | 'thinking';
  };
}

export interface SharedProject {
  project: TabData;
  favorites: GeneratedName[];
  shareInfo: ShareLink;
  comments: ProjectComment[];
}

// Generate a unique share ID
const generateShareId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create a share link for a project
export const createShareLink = async (
  projectId: string,
  projectName: string,
  ownerId: string,
  ownerName: string,
  shareType: ShareType,
  permission: SharePermission,
  projectData: TabData,
  favorites: GeneratedName[]
): Promise<ShareLink> => {
  const shareId = generateShareId();
  
  const shareLink: ShareLink = {
    id: shareId,
    projectId,
    projectName,
    ownerId,
    ownerName,
    shareType,
    permission,
    createdAt: serverTimestamp(),
    accessCount: 0,
    isActive: true,
  };

  // Save share link metadata
  await setDoc(doc(db, 'shares', shareId), shareLink);
  
  // Save project data for sharing
  await setDoc(doc(db, 'shared_projects', shareId), {
    project: projectData,
    favorites: favorites.filter(f => f.tabId === projectId),
    updatedAt: serverTimestamp(),
  });

  return { ...shareLink, id: shareId };
};

// Get shared project by share ID
export const getSharedProject = async (shareId: string): Promise<SharedProject | null> => {
  try {
    // Get share link info
    const shareDoc = await getDoc(doc(db, 'shares', shareId));
    if (!shareDoc.exists() || !shareDoc.data().isActive) {
      return null;
    }
    
    const shareInfo = { ...shareDoc.data(), id: shareId } as ShareLink;
    
    // Increment access count
    await setDoc(doc(db, 'shares', shareId), {
      accessCount: (shareInfo.accessCount || 0) + 1,
    }, { merge: true });
    
    // Get project data
    const projectDoc = await getDoc(doc(db, 'shared_projects', shareId));
    if (!projectDoc.exists()) {
      return null;
    }
    
    const projectData = projectDoc.data();
    
    // Get comments
    const commentsQuery = query(
      collection(db, 'comments'),
      where('projectId', '==', shareInfo.projectId)
    );
    const commentsSnap = await getDocs(commentsQuery);
    const comments = commentsSnap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as ProjectComment[];
    
    return {
      project: projectData.project as TabData,
      favorites: projectData.favorites as GeneratedName[],
      shareInfo,
      comments,
    };
  } catch (error) {
    console.error('Error getting shared project:', error);
    return null;
  }
};

// Add a comment to a shared project
export const addComment = async (
  projectId: string,
  nameId: string,
  nameName: string,
  authorId: string,
  authorName: string,
  authorPhoto: string | undefined,
  content: string,
  parentId?: string
): Promise<ProjectComment> => {
  const commentRef = doc(collection(db, 'comments'));
  
  const comment: ProjectComment = {
    id: commentRef.id,
    projectId,
    nameId,
    nameName,
    authorId,
    authorName,
    authorPhoto,
    content,
    createdAt: serverTimestamp(),
    parentId,
  };
  
  await setDoc(commentRef, comment);
  return comment;
};

// Subscribe to comments in real-time
export const subscribeToComments = (
  projectId: string,
  callback: (comments: ProjectComment[]) => void
): Unsubscribe => {
  const commentsQuery = query(
    collection(db, 'comments'),
    where('projectId', '==', projectId)
  );
  
  return onSnapshot(commentsQuery, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as ProjectComment[];
    callback(comments.sort((a, b) => 
      (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
    ));
  });
};

// Delete a share link
export const deleteShareLink = async (shareId: string): Promise<void> => {
  console.log('[Sharing] Attempting to delete share link:', shareId);
  
  try {
    // Delete the main share document
    const shareRef = doc(db, 'shares', shareId);
    await deleteDoc(shareRef);
    console.log('[Sharing] Successfully deleted share document');
    
    // Try to delete shared project data (may not exist)
    try {
      const projectRef = doc(db, 'shared_projects', shareId);
      await deleteDoc(projectRef);
      console.log('[Sharing] Successfully deleted shared project document');
    } catch (projectError) {
      // It's okay if shared_projects doc doesn't exist
      console.warn('[Sharing] Could not delete shared_projects (may not exist):', projectError);
    }
    
    console.log('[Sharing] Delete operation completed successfully');
  } catch (error: any) {
    console.error('[Sharing] Delete error:', error);
    console.error('[Sharing] Error code:', error?.code);
    console.error('[Sharing] Error message:', error?.message);
    throw new Error(`Failed to delete share link: ${error?.message || 'Unknown error'}`);
  }
};

// Get all share links for a user
export const getUserShareLinks = async (userId: string): Promise<ShareLink[]> => {
  const sharesQuery = query(
    collection(db, 'shares'),
    where('ownerId', '==', userId),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(sharesQuery);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  })) as ShareLink[];
};
