import React, { useState, useEffect, useRef } from 'react';
import { MapView } from './components/MapView';
import { ChatBubble } from './components/ChatBubble';
import { sendMessage } from './services/gemini';
import { ChatMessage } from './types';
import { Send, Map as MapIcon, MessageSquare, Navigation, Loader2, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: "Hello! I'm your AI Map Assistant. Ask me about places nearby, directions, or information about any location in the world.",
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]); // Default London
  const [mapZoom, setMapZoom] = useState(13);
  const [markers, setMarkers] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const location = userLocation ? { latitude: userLocation[0], longitude: userLocation[1] } : undefined;
      
      const response = await sendMessage(input, history, location);
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        timestamp: Date.now(),
        groundingChunks: response.groundingChunks
      };

      setMessages(prev => [...prev, modelMsg]);

      // Try to extract coordinates from grounding chunks to update map
      if (response.groundingChunks && response.groundingChunks.length > 0) {
        const newMarkers: any[] = [];
        response.groundingChunks.forEach((chunk: any, idx: number) => {
          if (chunk.maps) {
            // We can't easily get lat/lng from the URI without another API call,
            // but we can try to find them if they are in the URI (common in Google Maps links)
            const match = chunk.maps.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (match) {
              const lat = parseFloat(match[1]);
              const lng = parseFloat(match[2]);
              newMarkers.push({
                id: `marker-${idx}`,
                position: [lat, lng],
                title: chunk.maps.title,
                description: 'Found via Google Maps'
              });
            }
          }
        });

        if (newMarkers.length > 0) {
          setMarkers(newMarkers);
          setMapCenter(newMarkers[0].position);
          setMapZoom(15);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "Sorry, I encountered an error while searching for that. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F5F5F5] overflow-hidden font-sans">
      {/* Sidebar / Chat Area */}
      <div className="w-full md:w-[450px] flex flex-col bg-white border-r border-gray-200 shadow-xl z-10">
        <header className="p-6 border-bottom border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
              <Compass size={24} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">GeoChat</h1>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">AI Map Assistant</p>
            </div>
          </div>
          {userLocation && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm italic">
              <Loader2 size={16} className="animate-spin" />
              Searching maps and web...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-6 border-t border-gray-100">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a place..."
              className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="mt-3 text-[10px] text-center text-gray-400">
            Powered by Gemini 2.5 Flash & Google Maps Grounding
          </p>
        </footer>
      </div>

      {/* Map Area */}
      <div className="hidden md:block flex-1 relative bg-gray-100">
        <MapView 
          center={mapCenter} 
          zoom={mapZoom} 
          markers={markers} 
        />
        
        {/* Floating Map Controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-2 z-[1000]">
          <button 
            onClick={() => userLocation && setMapCenter(userLocation)}
            className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
            title="My Location"
          >
            <Navigation size={20} className="text-gray-700" />
          </button>
          <button 
            onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
            className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100 font-bold text-lg"
          >
            +
          </button>
          <button 
            onClick={() => setMapZoom(prev => Math.max(prev - 1, 3))}
            className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100 font-bold text-lg"
          >
            -
          </button>
        </div>

        {/* Legend / Info Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 max-w-xs"
          >
            <div className="flex items-center gap-2 mb-2">
              <MapIcon size={16} className="text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Interactive Map</span>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Locations mentioned in the chat will appear here. You can click on markers to see more details.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
