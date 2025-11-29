// Index.tsx (Complete Single File - Must be run alongside the Node.js server)

import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import React, { useState, useRef, useEffect, useCallback } from 'react'; // Added React imports for Chatbot
import {
  Database,
  TrendingUp,
  Zap,
  Truck,
  MessageCircle,
  Brain,
  ArrowRight,
  CheckCircle,
  Users,
  Shield,
  Globe,
  Bot,
  User,
  Send,
  X,
  Loader2,
} from "lucide-react";

// Assuming you have placeholder components for UI elements (adjust paths if needed)
// Replace these with your actual UI component imports (e.g., shadcn/ui)
const Button = ({ children, onClick, type, disabled, size, className, title }: any) => (
  <button onClick={onClick} type={type} disabled={disabled} className={`p-2 rounded-lg ${className}`} title={title}>{children}</button>
);
const Textarea = (props: any) => (
  <textarea {...props} className={`border border-border p-2 rounded-lg w-full ${props.className}`} />
);


// --- START CHATBOT COMPONENTS ---

type Message = {
  id: number;
  sender: 'user' | 'bot';
  text: string | React.ReactNode;
};

// ** NOTE: This function calls your secure backend server running on port 3001 **
const fetchBotResponse = async (query: string): Promise<string> => {
  const isNewsQuery = query.toLowerCase().includes('news') || query.toLowerCase().includes('healthcare update');
  const isDataQuery = query.toLowerCase().includes('outbreak') || query.toLowerCase().includes('patient') || query.toLowerCase().includes('cases');

  let endpoint = '';
  if (isNewsQuery) {
    endpoint = 'http://localhost:3001/api/chatbot/news';
  } else if (isDataQuery) {
    endpoint = 'http://localhost:3001/api/chatbot/data';
  } else {
    // Default to a general query endpoint that the backend can handle
    endpoint = 'http://localhost:3001/api/chatbot/data';
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Backend call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "Sorry, the server returned an empty response.";

  } catch (error) {
    console.error("Chatbot API Error:", error);
    return "Error: Could not connect to the backend service (http://localhost:3001). Check if the server.js is running.";
  }
};

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.sender === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start max-w-[75%] gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`p-2 rounded-full ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        <div className={`p-3 rounded-xl shadow-md text-sm whitespace-pre-line ${isUser ? 'bg-primary/90 text-white rounded-tr-none' : 'bg-background border border-border rounded-tl-none'}`}>
          {message.text}
        </div>
      </div>
    </div>
  );
};

export const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const welcomeMessage = useCallback(() => {
    setMessages([{
      id: Date.now(),
      sender: 'bot',
      text: (
        <>
          Hello! I'm Medlyf AI Assistant, powered by Sarvam AI and your system data. How can I help?
          <br /><br />
          Try asking:
          <ul className="list-disc list-inside mt-2">
            <li>"What is the latest healthcare news?"</li>
            <li>"Report on active outbreaks." (Queries MongoDB)</li>
          </ul>
        </>
      )
    }]);
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      welcomeMessage();
    }
  }, [isOpen, messages.length, welcomeMessage]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const userQuery = input.trim();
    if (!userQuery) return;

    const newUserMessage: Message = { id: Date.now(), sender: 'user', text: userQuery };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const botResponseText = await fetchBotResponse(userQuery);
      const newBotMessage: Message = { id: Date.now() + 1, sender: 'bot', text: botResponseText };
      setMessages(prev => [...prev, newBotMessage]);
    } catch (error) {
      const errorMessage: Message = { id: Date.now() + 1, sender: 'bot', text: 'An unexpected error occurred. Check the console.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all z-[1000]"
        title="Open Chatbot"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-sm h-[80vh] max-h-[600px] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-[1000]">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> Medlyf AI Assistant
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          title="Close Chatbot"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start max-w-[75%] gap-2">
              <div className="p-2 rounded-full bg-muted text-muted-foreground">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-xl shadow-md text-sm bg-background border border-border rounded-tl-none">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Typing...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e: any) => setInput(e.target.value)}
            placeholder="Ask about news or patient data..."
            className="flex-grow resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
};

// --- END CHATBOT COMPONENTS ---

const Agent = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-lg transition-all group">
    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-secondary/30 transition-colors">
      {Icon}
    </div>
    <h3 className="font-semibold text-lg mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">
      {description}
    </p>
  </div>
);

const Feature = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0">
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
        {Icon}
      </div>
    </div>
    <div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  </div>
);

export default function Index() {
  const { isAuthenticated } = useAuth(); // Assuming useAuth() is available

  return (
    <Layout authenticated={false}>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 px-4">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 left-10 w-72 h-72 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-4 inline-block">
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  ✨ Powered by Advanced AI
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="text-gradient">Medlyf</span>
                <br />
                <span className="text-foreground">Intelligent Healthcare System</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Adaptive multi-agent AI system for predicting and managing ICU
                and oxygen demand across Tier-2 and Tier-3 hospitals. Real-time
                forecasting, resource optimization, and intelligent
                coordination.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                <button className="px-8 py-4 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors">
                  Learn More
                </button>
              </div>

              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Trusted by 50+ hospitals across India
              </p>
            </div>

            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-border overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 p-8">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-3">
                    <div className="h-3 bg-primary/30 rounded-full"></div>
                    <div className="h-3 bg-secondary/25 rounded-full w-4/5"></div>
                    <div className="h-3 bg-accent/20 rounded-full w-3/5"></div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-success/30 to-primary/30 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-white/30 dark:bg-white/10 rounded-lg">
                    <span className="text-xs text-muted-foreground">ICU Capacity</span>
                    <span className="text-sm font-bold text-success">78%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/30 dark:bg-white/10 rounded-lg">
                    <span className="text-xs text-muted-foreground">Oxygen Supply</span>
                    <span className="text-sm font-bold text-warning">92%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/30 dark:bg-white/10 rounded-lg">
                    <span className="text-xs text-muted-foreground">Predictions Active</span>
                    <span className="text-sm font-bold text-primary">24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six Agents Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Six Coordinated Agents</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our autonomous agents work together seamlessly through a central
              orchestrator to manage every aspect of ICU operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Agent
              icon={<Database className="w-6 h-6 text-primary" />}
              title="Data Ingestion Agent"
              description="Continuously collects and validates real-time data from hospital systems, IoT devices, and health management platforms."
            />
            <Agent
              icon={<TrendingUp className="w-6 h-6 text-secondary" />}
              title="Forecasting Agent"
              description="Predicts ICU bed demand, oxygen consumption, and patient flow patterns using advanced ML models."
            />
            <Agent
              icon={<Zap className="w-6 h-6 text-accent" />}
              title="Resource Optimization Agent"
              description="Allocates oxygen, beds, ventilators, and staff efficiently based on real-time demand and capacity."
            />
            <Agent
              icon={<Truck className="w-6 h-6 text-primary" />}
              title="Logistics Coordination Agent"
              description="Manages supply chain, coordinates deliveries, and optimizes distribution of critical resources."
            />
            <Agent
              icon={<MessageCircle className="w-6 h-6 text-secondary" />}
              title="Communication Agent"
              description="Generates multilingual alerts, advisories, and notifications in local languages for accessibility."
            />
            <Agent
              icon={<Brain className="w-6 h-6 text-accent" />}
              title="Feedback Learning Agent"
              description="Continuously learns from outcomes, improves predictions, and adapts strategies based on historical data."
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-8">Powerful Capabilities</h2>
              <div className="space-y-6">
                <Feature
                  icon={<Globe className="w-5 h-5 text-primary" />}
                  title="Real-Time Dashboard"
                  description="Monitor ICU status, oxygen levels, and resource availability across all connected hospitals."
                />
                <Feature
                  icon={<TrendingUp className="w-5 h-5 text-secondary" />}
                  title="Predictive Analytics"
                  description="AI-powered forecasting for demand planning with 85%+ accuracy rates."
                />
                <Feature
                  icon={<Users className="w-5 h-5 text-accent" />}
                  title="Multi-Hospital Network"
                  description="Coordinate resources across hospital networks for optimal utilization."
                />
                <Feature
                  icon={<Shield className="w-5 h-5 text-info" />}
                  title="Secure & Compliant"
                  description="HIPAA-compliant with role-based access control and audit trails."
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5 p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                  <div className="w-3 h-3 rounded-full bg-success animate-pulse"></div>
                  <span className="text-sm font-medium">System Online</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Hospitals Connected", value: "50+" },
                    { label: "ICU Beds Managed", value: "5,000+" },
                    { label: "Daily Predictions", value: "10,000+" },
                    { label: "Average Accuracy", value: "87%" },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 bg-white/50 dark:bg-white/5 rounded-lg border border-border"
                    >
                      <span className="text-sm text-muted-foreground">
                        {stat.label}
                      </span>
                      <span className="font-bold text-primary">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Integrations Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Seamless Integrations</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connects with major health management systems and logistics
              partners
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              "Hospital EHR Systems",
              "IoT Medical Devices",
              "Logistics Partners",
              "Government Health Database",
            ].map((integration, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium text-sm">{integration}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 border border-primary/30 p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Transform Your Hospital Operations?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join 50+ hospitals already using Medlyf to save lives and
              optimize resources.
            </p>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Sign In Now <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* CHATBOT INTEGRATION */}
      <Chatbot />

    </Layout>
  );
}

// NOTE: You will need to ensure the following dummy components/context are defined elsewhere:
// - Layout component
// - useAuth hook
// - Link component from react-router-dom
// - Tailwind CSS classes like 'border-border', 'bg-card', 'text-muted-foreground', etc. are defined.
// - The "custom-scrollbar" class for the messages div in Chatbot