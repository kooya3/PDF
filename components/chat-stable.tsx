'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, type Message } from './chat-message';
import { useToast } from './ui/use-toast';
import { Send, Sparkles, MessageSquare, Loader2 } from 'lucide-react';

export function Chat() {
  // All hooks are called unconditionally at the top level
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    // Optimistic UI update
    setMessages(prev => [
      ...prev,
      userMessage,
      {
        role: 'assistant',
        content: 'Thinking...',
        id: (Date.now() + 1).toString(),
        timestamp: new Date(),
      }
    ]);
    
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from API');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content,
        id: (Date.now() + 2).toString(),
        timestamp: new Date(),
      };

      // Replace the "Thinking..." message with the actual response
      setMessages(prev => [
        ...prev.slice(0, -1),
        assistantMessage
      ]);

    } catch (error) {
      console.error('Chat error:', error);
      
      let errorMessage = 'Unknown error occurred';
      let toastTitle = 'Error';
      
      if (error instanceof Error) {
        if (error.message.includes('balance_insufficient') || error.message.includes('Insufficient balance')) {
          errorMessage = 'AI service account has insufficient balance. Please recharge your account to continue.';
          toastTitle = 'Account Balance Required';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'API rate limit exceeded. Please wait a moment before trying again.';
          toastTitle = 'Rate Limited';
        } else if (error.message.includes('Failed to connect') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to Ollama. Please make sure Ollama is installed and running.';
          toastTitle = 'Ollama Not Available';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        variant: 'destructive',
        title: toastTitle,
        description: errorMessage,
      });

      // Replace "Thinking..." message with error message
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
          id: (Date.now() + 2).toString(),
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, toast]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  }, [sendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <motion.div 
      className="flex flex-col h-[700px] max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <motion.div 
        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-4 flex items-center space-x-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.div>
          <motion.div 
            className="absolute inset-0 bg-white/20 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0, 0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Local AI Assistant</h2>
          <p className="text-sm text-white/80">Powered by Ollama (Free & Local)</p>
        </div>
        <div className="flex-1" />
        <motion.div 
          className="flex items-center space-x-2 text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm">{messages.filter(m => m.content !== 'Thinking...').length} messages</span>
        </motion.div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900">
        {messages.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-12 w-12 text-indigo-500" />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              Welcome to Local AI Chat
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Start a conversation with your local AI assistant powered by Ollama. Completely free, private, and runs on your machine!
            </p>
          </motion.div>
        )}

        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLoading={isLoading && message.content === 'Thinking...'}
              />
            ))}
          </AnimatePresence>
        </div>
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <motion.div 
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send)"
              className="pr-12 h-12 text-base border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl transition-colors"
              disabled={isLoading}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <motion.div
                animate={input.trim() ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.2 }}
              >
                <Send className={`h-5 w-5 transition-colors ${
                  input.trim() 
                    ? 'text-indigo-500 dark:text-indigo-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
              </motion.div>
            </div>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="lg"
              className="h-12 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  animate={input.trim() ? { x: [0, 2, 0] } : {}}
                  transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Send className="h-5 w-5" />
                </motion.div>
              )}
            </Button>
          </motion.div>
        </form>
        
        <motion.p 
          className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Powered by Ollama (Free & Local) • Press Enter to send, Shift+Enter for new line
        </motion.p>
      </motion.div>
    </motion.div>
  );
}