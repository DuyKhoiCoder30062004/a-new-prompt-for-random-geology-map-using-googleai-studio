import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MapPin, ExternalLink, Globe } from 'lucide-react';
import { ChatMessage, GroundingChunk } from '../types';
import { motion } from 'motion/react';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-6`}
    >
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-black text-white rounded-tr-none'
            : 'bg-white border border-gray-100 shadow-sm rounded-tl-none'
        }`}
      >
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>

      {!isUser && message.groundingChunks && message.groundingChunks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
          {message.groundingChunks.map((chunk, idx) => {
            if (chunk.maps) {
              return (
                <a
                  key={`map-${idx}`}
                  href={chunk.maps.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  <MapPin size={10} />
                  <span>{chunk.maps.title}</span>
                  <ExternalLink size={10} />
                </a>
              );
            }
            if (chunk.web) {
              return (
                <a
                  key={`web-${idx}`}
                  href={chunk.web.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 text-[10px] font-medium rounded-full border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <Globe size={10} />
                  <span>{chunk.web.title}</span>
                  <ExternalLink size={10} />
                </a>
              );
            }
            return null;
          })}
        </div>
      )}
    </motion.div>
  );
};
