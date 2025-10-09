import React, { createContext, useContext, useState, useEffect } from 'react';

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

interface DataContextType {
  crops: Crop[];
  inputItems: InputItem[];
  logisticsRequests: LogisticsRequest[];
  communityPosts: CommunityPost[];
  addCrop: (crop: Omit<Crop, 'id' | 'bids' | 'currentBid'>) => void;
  addBid: (cropId: string, bid: Omit<Bid, 'id' | 'timestamp'>) => void;
  addLogisticsRequest: (request: Omit<LogisticsRequest, 'id'>) => void;
  addCommunityPost: (post: Omit<CommunityPost, 'id' | 'timestamp' | 'replies'>) => void;
  addReply: (postId: string, reply: Omit<Reply, 'id' | 'timestamp'>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [inputItems, setInputItems] = useState<InputItem[]>([]);
  const [logisticsRequests, setLogisticsRequests] = useState<LogisticsRequest[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

        setCrops(cropsData);
        setInputItems(inputsData);
        setCommunityPosts(communityData);
        setLogisticsRequests(logisticsData);
      } catch (err) {
        console.warn('Backend not reachable, using demo data', err);

        // Initialize with demo data (local fallback)
        const demoCrops: Crop[] = [
          {
            id: '1',
            name: 'Wheat',
            quantity: 100,
            unit: 'quintals',
            basePrice: 2000,
            currentBid: 2150,
            farmerId: 'farmer1',
            farmerName: 'राज कुमार',
            location: 'Punjab',
            imageUrl: '/images/crops/Wheat.jpg',
            bids: [
              { id: '1', buyerId: 'buyer1', buyerName: 'ABC Traders', amount: 2100, timestamp: '2025-01-01T10:00:00Z' },
              { id: '2', buyerId: 'buyer2', buyerName: 'XYZ Mills', amount: 2150, timestamp: '2025-01-01T11:00:00Z' }
            ],
            status: 'active',
            endTime: '2025-01-15T18:00:00Z'
          },
          {
            id: '2',
            name: 'Rice',
            quantity: 75,
            unit: 'quintals',
            basePrice: 1800,
            currentBid: 1950,
            farmerId: 'farmer2',
            farmerName: 'सुरेश पटेल',
            location: 'Haryana',
            imageUrl: '/images/crops/Rice.jpg',
            bids: [
              { id: '3', buyerId: 'buyer3', buyerName: 'Rice Export Co.', amount: 1950, timestamp: '2025-01-01T12:00:00Z' }
            ],
            status: 'active',
            endTime: '2025-01-14T18:00:00Z'
          }
        ];

        const getImageUrl = (cropName: string) => {
          const filenameMap: { [key: string]: string } = {
            'Wheat': 'Wheat.jpg',
            'Rice': 'Rice.jpg',
            'Corn/Maize': 'Corn.jpg',
            'Soybeans': 'Soybeans.jpg',
            'Cotton': 'Cotton.jpg',
            'Sugarcane': 'Sugarcane.jpg',
            'Potatoes': 'Potatoes.jpg',
            'Onions': 'Onions.jpg',
            'Tomatoes': 'Tomatoes.jpg',
            'Pulses (Lentils)': 'Pulse.jpg'
          };
          const filename = filenameMap[cropName] || `${cropName}.jpg`;
          return `/images/crops/${filename}`;
        };

        const cropsWithLocalImages = demoCrops.map(crop => ({ ...crop, imageUrl: getImageUrl(crop.name) }));

        const demoInputs: InputItem[] = [
          {
            id: '1',
            name: 'Wheat Seeds (HD-2967)',
            category: 'seeds',
            price: 45,
            unit: 'per kg',
            imageUrl: '/images/static/wheat-seeds.jpg',
            vendorId: 'vendor1',
            vendorName: 'AgriSeeds Pvt Ltd',
            description: 'High yielding wheat variety suitable for North Indian conditions',
            inStock: true
          },
          {
            id: '2',
            name: 'NPK Fertilizer (10:26:26)',
            category: 'fertilizers',
            price: 1200,
            unit: 'per 50kg bag',
            imageUrl: '/images/static/npk-fertilizer.jpg',
            vendorId: 'vendor2',
            vendorName: 'FertiFarm Solutions',
            description: 'Balanced NPK fertilizer for better crop growth',
            inStock: true
          }
        ];

        const demoPosts: CommunityPost[] = [
          {
            id: '1',
            authorId: 'farmer1',
            authorName: 'राज कुमार',
            title: 'Wheat crop disease prevention tips',
            content: 'I want to share some effective methods for preventing rust disease in wheat crops...',
            timestamp: '2025-01-01T09:00:00Z',
            replies: [
              {
                id: '1',
                authorId: 'farmer3',
                authorName: 'अमित शर्मा',
                content: 'Very helpful! I will try these methods in my field.',
                timestamp: '2025-01-01T10:00:00Z'
              }
            ]
          }
        ];

        setCrops(cropsWithLocalImages);
        setInputItems(demoInputs);
        setCommunityPosts(demoPosts);
      }
    };

    loadFromBackend();
  }, []);

  const addCrop = (cropData: Omit<Crop, 'id' | 'bids' | 'currentBid'>) => {
    // POST to backend, fallback to local update
    const postCrop = async () => {
      try {
  const res = await fetch(`${API}/crops`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cropData)
        });
        if (!res.ok) {
          let errMsg = 'Failed to add crop';
          try {
            const errBody = await res.json();
            if (errBody && errBody.error) errMsg = String(errBody.error);
          } catch (e) {}
          // surface server message to developer/user
          window.alert(`Add crop failed: ${errMsg}`);
          throw new Error(errMsg);
        }
        const created = await res.json();
        setCrops(prev => [created, ...prev]);
      } catch (err) {
        // Try to surface server-provided error details when available
        try {
          // @ts-ignore
          if (err && err.message === 'Failed to add crop' && typeof err === 'object') {
            // no-op — fall through to logging below
          }
        } catch (e) {}
        console.warn('Add crop failed, updating locally', err);
        const newCrop: Crop = {
          ...cropData,
          id: Date.now().toString(),
          bids: [],
          currentBid: cropData.basePrice
        };
        setCrops(prev => [newCrop, ...prev]);
      }
    };

    postCrop();
  };

  const addBid = (cropId: string, bidData: Omit<Bid, 'id' | 'timestamp'>) => {
    const postBid = async () => {
      try {
  const res = await fetch(`${API}/crops/${cropId}/bids`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bidData)
        });
        if (!res.ok) {
          let errMsg = 'Failed to post bid';
          try {
            const errBody = await res.json();
            if (errBody && errBody.error) errMsg = String(errBody.error);
          } catch (e) {}
          window.alert(`Bid failed: ${errMsg}`);
          throw new Error(errMsg);
        }
        const created = await res.json();
        setCrops(prev => prev.map(crop => {
          if (crop.id === cropId) {
            const updatedBids = [...crop.bids, created];
            return {
              ...crop,
              bids: updatedBids,
              currentBid: Math.max(crop.currentBid, created.amount)
            };
          }
          return crop;
        }));
      } catch (err) {
          // parse server error body if available to surface clearer message
          try {
            // @ts-ignore
            if (err && err.response) {
              // axios-like error, not expected here
            }
          } catch (e) {}
          console.warn('Post bid failed, updating locally', err);
        const newBid: Bid = {
          ...bidData,
          id: Date.now().toString(),
          timestamp: new Date().toISOString()
        };
        setCrops(prev => prev.map(crop => {
          if (crop.id === cropId) {
            const updatedBids = [...crop.bids, newBid];
            return {
              ...crop,
              bids: updatedBids,
              currentBid: Math.max(crop.currentBid, newBid.amount)
            };
          }
          return crop;
        }));
      }
    };

    postBid();
  };

  const addLogisticsRequest = (requestData: Omit<LogisticsRequest, 'id'>) => {
    const postRequest = async () => {
      try {
  const res = await fetch(`${API}/logistics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });
        if (!res.ok) {
          let errMsg = 'Failed to post logistics request';
          try {
            const errBody = await res.json();
            if (errBody && errBody.error) errMsg = String(errBody.error);
          } catch (e) {}
          window.alert(`Logistics request failed: ${errMsg}`);
          throw new Error(errMsg);
        }
        const created = await res.json();
        setLogisticsRequests(prev => [created, ...prev]);
      } catch (err) {
        console.warn('Post logistics failed, updating locally', err);
        const newRequest: LogisticsRequest = {
          ...requestData,
          id: Date.now().toString()
        };
        setLogisticsRequests(prev => [newRequest, ...prev]);
      }
    };

    postRequest();
  };

  const addCommunityPost = (postData: Omit<CommunityPost, 'id' | 'timestamp' | 'replies'>) => {
    const post = async () => {
      try {
  const res = await fetch(`${API}/community`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        if (!res.ok) {
          let errMsg = 'Failed to post community post';
          try {
            const errBody = await res.json();
            if (errBody && errBody.error) errMsg = String(errBody.error);
          } catch (e) {}
          window.alert(`Community post failed: ${errMsg}`);
          throw new Error(errMsg);
        }
        const created = await res.json();
        setCommunityPosts(prev => [created, ...prev]);
      } catch (err) {
        console.warn('Post community failed, updating locally', err);
        const newPost: CommunityPost = {
          ...postData,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          replies: []
        };
        setCommunityPosts(prev => [newPost, ...prev]);
      }
    };

    post();
  };

  const addReply = (postId: string, replyData: Omit<Reply, 'id' | 'timestamp'>) => {
    const post = async () => {
      try {
  const res = await fetch(`${API}/community/${postId}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(replyData)
        });
        if (!res.ok) {
          let errMsg = 'Failed to post reply';
          try {
            const errBody = await res.json();
            if (errBody && errBody.error) errMsg = String(errBody.error);
          } catch (e) {}
          window.alert(`Reply failed: ${errMsg}`);
          throw new Error(errMsg);
        }
        const created = await res.json();
        setCommunityPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              replies: [...post.replies, created]
            };
          }
          return post;
        }));
      } catch (err) {
        console.warn('Post reply failed, updating locally', err);
        const newReply: Reply = {
          ...replyData,
          id: Date.now().toString(),
          timestamp: new Date().toISOString()
        };
        setCommunityPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              replies: [...post.replies, newReply]
            };
          }
          return post;
        }));
      }
    };

    post();
  };

  return (
    <DataContext.Provider value={{
      crops,
      inputItems,
      logisticsRequests,
      communityPosts,
      addCrop,
      addBid,
      addLogisticsRequest,
      addCommunityPost,
      addReply
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
  return context;
};