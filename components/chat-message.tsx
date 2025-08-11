'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BotIcon, UserIcon, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export const ChatMessage = React.memo(function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  const { user } = useUser();
  const isHuman = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      className={`chat ${isHuman ? 'chat-end' : 'chat-start'} group`}
    >
      {/* Avatar */}
      <div className="chat-image avatar">
        <motion.div 
          className="w-10 rounded-full ring-2 ring-indigo-500/20 group-hover:ring-indigo-500/40 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isHuman ? (
            user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt="User avatar"
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center rounded-full">
                <UserIcon className="text-white h-5 w-5" />
              </div>
            )
          ) : (
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center rounded-full shadow-lg">
              <BotIcon className="text-white h-6 w-6" />
            </div>
          )}
        </motion.div>
      </div>

      {/* Message Bubble */}
      <motion.div
        className={`chat-bubble prose prose-sm max-w-xs sm:max-w-md lg:max-w-lg relative ${
          isHuman
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 border border-gray-200 dark:border-gray-700'
        }`}
        whileHover={{ 
          scale: 1.02,
          boxShadow: isHuman 
            ? '0 20px 25px -5px rgb(99 102 241 / 0.3), 0 10px 10px -5px rgb(99 102 241 / 0.2)'
            : '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.1)'
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Message Content */}
        <div className="relative z-10">
          {isLoading && message.content === 'Thinking...' ? (
            <motion.div 
              className="flex items-center space-x-2 py-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">AI is thinking...</span>
              <motion.div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      isHuman ? 'bg-white/70' : 'bg-gray-400'
                    }`}
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.7, 1, 0.7] 
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity,
                      delay: i * 0.2 
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`prose-sm ${isHuman ? 'prose-invert' : ''}`}
            >
              {isHuman ? (
                <p className="m-0 whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
                  <Markdown>
                    {message.content}
                  </Markdown>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Hover effect overlay */}
        <motion.div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: isHuman 
              ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.02) 100%)'
          }}
        />
      </motion.div>

      {/* Timestamp */}
      <motion.div 
        className="chat-footer opacity-50 text-xs mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {message.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </motion.div>
    </motion.div>
  );
});