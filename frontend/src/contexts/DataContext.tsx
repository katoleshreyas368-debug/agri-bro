import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { demoCrops, demoInputs, demoPosts } from './demo-data';
import { useAuth } from './AuthContext';

export interface Crop {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  basePrice: number;
  currentBid: number;
  farmerId: string;
  farmerName: string;
  location: string;
  imageUrl: string;
  bids: Bid[];
  status: 'active' | 'completed' | 'expired';
  endTime: string;
}

export interface Bid {
  id: string;
  buyerId: string;
  buyerName: string;
  amount: number;
  timestamp: string;
}

export interface InputItem {
  id: string;
  name: string;
  category: 'seeds' | 'fertilizers' | 'pesticides';
  price: number;
  unit: string;
  imageUrl: string;
  vendorId: string;
  vendorName: string;
  description: string;
  inStock: boolean;
}

export interface LogisticsRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  cropType: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  status: 'pending' | 'matched' | 'completed';
  requestedDate: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  timestamp: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

interface DataState {
  crops: Crop[];
  inputItems: InputItem[];
  logisticsRequests: LogisticsRequest[];
  communityPosts: CommunityPost[];
  error: string | null;
}

type DataAction =
  | { type: 'SET_ALL_DATA'; payload: { crops: Crop[]; inputItems: InputItem[]; communityPosts: CommunityPost[]; logisticsRequests: LogisticsRequest[] } }
  | { type: 'SET_DEMO_DATA' }
  | { type: 'ADD_CROP'; payload: Crop }
  | { type: 'ADD_BID'; payload: { cropId: string; bid: Bid } }
  | { type: 'ADD_LOGISTICS_REQUEST'; payload: LogisticsRequest }
  | { type: 'ADD_COMMUNITY_POST'; payload: CommunityPost }
  | { type: 'ADD_REPLY'; payload: { postId: string; reply: Reply } }
  | { type: 'SET_ERROR'; payload: string | null };

interface DataContextType {
  state: DataState;
  addCrop: (crop: Omit<Crop, 'id' | 'bids' | 'currentBid' | 'farmerId' | 'farmerName'>) => void;
  addBid: (cropId: string, bid: Omit<Bid, 'id' | 'timestamp' | 'buyerId' | 'buyerName'>) => void;
  addLogisticsRequest: (request: Omit<LogisticsRequest, 'id' | 'farmerId' | 'farmerName'>) => void;
  addCommunityPost: (post: Omit<CommunityPost, 'id' | 'timestamp' | 'replies' | 'authorId' | 'authorName'>) => void;
  addReply: (postId: string, reply: Omit<Reply, 'id' | 'timestamp' | 'authorId' | 'authorName'>) => void;
  clearError: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialState: DataState = {
  crops: [],
  inputItems: [],
  logisticsRequests: [],
  communityPosts: [],
  error: null,
};

const dataReducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case 'SET_ALL_DATA':
      return { ...state, ...action.payload, error: null };
    case 'SET_DEMO_DATA':
      return {
        ...state,
        crops: demoCrops,
        inputItems: demoInputs,
        communityPosts: demoPosts,
        logisticsRequests: [],
        error: 'Backend not reachable, using demo data.'
      };
    case 'ADD_CROP':
      return { ...state, crops: [action.payload, ...state.crops] };
    case 'ADD_BID':
      return {
        ...state,
        crops: state.crops.map(c =>
          c.id === action.payload.cropId
            ? { ...c, bids: [...c.bids, action.payload.bid], currentBid: Math.max(c.currentBid, action.payload.bid.amount) }
            : c
        )
      };
    case 'ADD_LOGISTICS_REQUEST':
      return { ...state, logisticsRequests: [action.payload, ...state.logisticsRequests] };
    case 'ADD_COMMUNITY_POST':
      return { ...state, communityPosts: [action.payload, ...state.communityPosts] };
    case 'ADD_REPLY':
      return {
        ...state,
        communityPosts: state.communityPosts.map(p =>
          p.id === action.payload.postId
            ? { ...p, replies: [...p.replies, action.payload.reply] }
            : p
        )
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

async function postAPI<T>(endpoint: string, body: any, token: string | null): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'Request failed with status ' + res.status }));
    throw new Error(errBody.error || 'An unknown error occurred');
  }
  return res.json();
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const { token } = useAuth();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // Try to load data from backend, fall back to local demo if unavailable

    const loadFromBackend = async () => {
      try {
        const [cropsRes, inputsRes, communityRes, logisticsRes] = await Promise.all([
          fetch(`${API}/crops`),
          fetch(`${API}/inputs`),
          fetch(`${API}/community`),
          fetch(`${API}/logistics`)
        ]);

        if (!cropsRes.ok) throw new Error('crops fetch failed');
        const cropsData = await cropsRes.json();
        const inputsData = inputsRes.ok ? await inputsRes.json() : [];
        const communityData = communityRes.ok ? await communityRes.json() : [];
        const logisticsData = logisticsRes.ok ? await logisticsRes.json() : [];

        dispatch({
          type: 'SET_ALL_DATA',
          payload: {
            crops: cropsData,
            inputItems: inputsData,
            communityPosts: communityData,
            logisticsRequests: logisticsData,
          },
        });
      } catch (err) {
        console.warn('Backend not reachable, using demo data. Error:', err);
        dispatch({ type: 'SET_DEMO_DATA' });
      }
    };

    loadFromBackend();
  }, [API]); // This effect should only run once on mount.

  const addCrop = async (cropData: Omit<Crop, 'id' | 'bids' | 'currentBid' | 'farmerId' | 'farmerName'>) => {
    try {
      const newCrop = await postAPI<Crop>(`${API}/crops`, cropData, token);
      dispatch({ type: 'ADD_CROP', payload: newCrop });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: `Add crop failed: ${err.message}` });
    }
  };

  const addBid = async (cropId: string, bidData: Omit<Bid, 'id' | 'timestamp' | 'buyerId' | 'buyerName'>) => {
    try {
      const newBid = await postAPI<Bid>(`${API}/crops/${cropId}/bids`, bidData, token);
      dispatch({ type: 'ADD_BID', payload: { cropId, bid: newBid } });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: `Bid failed: ${err.message}` });
    }
  };

  const addLogisticsRequest = async (requestData: Omit<LogisticsRequest, 'id' | 'farmerId' | 'farmerName'>) => {
    try {
      const newRequest = await postAPI<LogisticsRequest>(`${API}/logistics`, requestData, token);
      dispatch({ type: 'ADD_LOGISTICS_REQUEST', payload: newRequest });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: `Logistics request failed: ${err.message}` });
    }
  };

  const addCommunityPost = async (postData: Omit<CommunityPost, 'id' | 'timestamp' | 'replies' | 'authorId' | 'authorName'>) => {
    try {
      const newPost = await postAPI<CommunityPost>(`${API}/community`, postData, token);
      dispatch({ type: 'ADD_COMMUNITY_POST', payload: newPost });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: `Community post failed: ${err.message}` });
    }
  };

  const addReply = async (postId: string, replyData: Omit<Reply, 'id' | 'timestamp' | 'authorId' | 'authorName'>) => {
    try {
      const newReply = await postAPI<Reply>(`${API}/community/${postId}/replies`, replyData, token);
      dispatch({ type: 'ADD_REPLY', payload: { postId, reply: newReply } });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: `Reply failed: ${err.message}` });
    }
  };

  const clearError = () => dispatch({ type: 'SET_ERROR', payload: null });

  return (
    <DataContext.Provider value={{
      state,
      addCrop,
      addBid,
      addLogisticsRequest,
      addCommunityPost,
      addReply,
      clearError,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  // Spread state properties for easier consumption
  return {
    ...context.state,
    ...context,
  };
};