import React, { useState, useEffect } from "react";
import ConversationArea from "./ConversationArea";
import MessageInput from "./MessageInput";
import DocumentSidebar from "../sidebar/DocumentSidebar";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  documentReferences?: DocumentReference[];
  isLoading?: boolean;
}

interface DocumentReference {
  id: string;
  name: string;
  url: string;
}

interface Document extends DocumentReference {
  isReferenced?: boolean;
}

interface ChatContainerProps {
  initialMessages?: Message[];
  initialDocuments?: Document[];
}

const ChatContainer = ({
  initialMessages = [
    {
      id: "1",
      content: "Hello! I'm Sam, your AI assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(Date.now() - 60000 * 5),
    },
  ],
  initialDocuments = [],
}: ChatContainerProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Show sidebar if there are any referenced documents
  useEffect(() => {
    const hasReferencedDocs = documents.some((doc) => doc.isReferenced);
    if (hasReferencedDocs && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  }, [documents, isSidebarOpen]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate bot typing
    setIsLoading(true);
    const botTypingMessage: Message = {
      id: `typing-${Date.now()}`,
      content: "",
      sender: "bot",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, botTypingMessage]);

    // Simulate bot response after delay
    setTimeout(() => {
      setIsLoading(false);
      setMessages((prev) => prev.filter((msg) => !msg.isLoading));

      // Simulate bot response with document reference
      const botResponse: Message = {
        id: `bot-${Date.now()}`,
        content: `I've analyzed your request about "${content}". Here's what I found based on the available information.`,
        sender: "bot",
        timestamp: new Date(),
        documentReferences:
          Math.random() > 0.5 && documents.length > 0
            ? [documents[Math.floor(Math.random() * documents.length)]]
            : undefined,
      };

      setMessages((prev) => [...prev, botResponse]);

      // Update document reference status if a document was referenced
      if (botResponse.documentReferences?.length) {
        setDocuments((prev) =>
          prev.map((doc) => {
            if (
              botResponse.documentReferences?.some((ref) => ref.id === doc.id)
            ) {
              return { ...doc, isReferenced: true };
            }
            return doc;
          }),
        );
      }
    }, 1500);
  };

  const handleAttachFile = (file: File) => {
    // Create a new document from the file
    const newDocument: Document = {
      id: `doc-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      isReferenced: false,
    };

    setDocuments((prev) => [...prev, newDocument]);

    // Add a system message about the uploaded document
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      content: `You've uploaded "${file.name}". I'll analyze this document for you.`,
      sender: "bot",
      timestamp: new Date(),
      documentReferences: [newDocument],
    };

    setMessages((prev) => [...prev, systemMessage]);

    // Mark the document as referenced
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === newDocument.id) {
          return { ...doc, isReferenced: true };
        }
        return doc;
      }),
    );
  };

  const handleDocumentClick = (document: DocumentReference) => {
    // Highlight the document in the sidebar
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === document.id) {
          return { ...doc, isReferenced: true };
        }
        return doc;
      }),
    );

    // Ensure sidebar is open
    setIsSidebarOpen(true);
  };

  const handleViewDocument = (document: Document) => {
    // Open document in a new tab
    window.open(document.url, "_blank");
  };

  const handleDownloadDocument = (document: Document) => {
    // Create a download link and trigger it
    const link = document.createElement("a");
    link.href = document.url;
    link.download = document.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-full w-full bg-background">
      {/* Document Sidebar */}
      <DocumentSidebar
        documents={documents}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onViewDocument={handleViewDocument}
        onDownloadDocument={handleDownloadDocument}
      />

      {/* Chat Area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Conversation Area */}
        <ConversationArea
          messages={messages}
          onDocumentClick={handleDocumentClick}
        />

        {/* Message Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onAttachFile={handleAttachFile}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatContainer;
