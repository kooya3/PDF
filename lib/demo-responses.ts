// Demo responses for when Z.AI API is unavailable
export const getDemoResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase();
  
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! I'm your local AI assistant powered by Ollama. I'm currently running in demo mode because Ollama isn't started yet, but once you install and run Ollama, I'll have full AI capabilities! How can I assist you today?";
  }
  
  if (message.includes('help') || message.includes('what can you do')) {
    return "I can help you with various tasks including:\n\n• Answering questions about AI and technology\n• Providing programming assistance\n• Helping with research and analysis\n• Explaining complex concepts\n• Creative writing and brainstorming\n\n*Note: I'm currently in demo mode. Full functionality requires Ollama to be installed and running.*";
  }
  
  if (message.includes('api') || message.includes('ollama') || message.includes('install') || message.includes('setup') || message.includes('model') || message.includes('memory')) {
    return "I notice you're asking about Ollama setup! Your system has limited RAM (2.9GB), so you'll need a small model. Try these commands:\n\n1. **For low memory systems:** `ollama pull phi:2.7b` (1.6GB model)\n2. **Or even smaller:** `ollama pull tinyllama:1.1b` (637MB model)\n3. **Start Ollama:** `ollama serve` (if not already running)\n\n💡 **Tip:** If downloads are slow, let them run in a separate terminal. Your system already has Ollama installed and running!";
  }
  
  if (message.includes('code') || message.includes('programming') || message.includes('javascript') || message.includes('python')) {
    return "I'd love to help you with programming! Here's a simple example:\n\n```javascript\nfunction greetUser(name) {\n  return `Hello, ${name}! Welcome to Local AI chat.`;\n}\n\nconsole.log(greetUser('Developer'));\n```\n\nThis demonstrates how the chat interface can handle code blocks and formatting. What specific programming topic would you like to explore?";
  }
  
  if (message.includes('ai') || message.includes('artificial intelligence') || message.includes('machine learning')) {
    return "Artificial Intelligence is fascinating! It encompasses machine learning, natural language processing, computer vision, and more. The chat interface you're using right now demonstrates real-time AI conversation capabilities.\n\nSome key AI concepts:\n• **Machine Learning**: Algorithms that learn from data\n• **Neural Networks**: Brain-inspired computing models\n• **NLP**: Understanding and generating human language\n\nWhat aspect of AI interests you most?";
  }
  
  // Default responses
  const defaultResponses = [
    "That's an interesting question! I'm currently in demo mode, but this showcases how our chat interface handles conversations with smooth animations and real-time responses.",
    "Thanks for testing the chat interface! The UI demonstrates professional-grade conversation flow, even when running demo responses due to API limitations.",
    "I appreciate your message! This chat system features advanced animations, error handling, and responsive design. What would you like to explore next?",
    "Great question! The chat interface you're experiencing includes features like markdown rendering, message animations, and intelligent error handling.",
    "I'm impressed you're trying out the chat system! Even in demo mode, you can see the smooth user experience, toast notifications, and modern design patterns."
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};