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

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
  
    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      alert("You must be logged in.");
      return;
    }
  
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
  
    // Show loading bubble
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      content: "",
      sender: "bot",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);
    setIsLoading(true);
  
    try {
      const response = await fetch(
        "https://o43zaz9tv7.execute-api.us-west-2.amazonaws.com/prod/user/message",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: content }),
        }
      );
  
      const responseBody = await response.text(); // or response.json() if you're returning JSON
      setIsLoading(false);
      setMessages((prev) =>
        prev
          .filter((msg) => !msg.isLoading)
          .concat({
            id: `bot-${Date.now()}`,
            content: responseBody,
            sender: "bot",
            timestamp: new Date(),
          })
      );
    } catch (err) {
      console.error("Error calling API:", err);
      setIsLoading(false);
      setMessages((prev) =>
        prev
          .filter((msg) => !msg.isLoading)
          .concat({
            id: `bot-${Date.now()}`,
            content: "Oops! Something went wrong.",
            sender: "bot",
            timestamp: new Date(),
          })
      );
    }
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
