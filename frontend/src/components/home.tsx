import React, { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ChatContainer from "./chat/ChatContainer";
import ProfileDropdown from "./auth/ProfileDropdown";

const Home = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-background">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8 bg-primary">
            <div className="h-full w-full rounded-full flex items-center justify-center text-white font-medium">
              S
            </div>
          </Avatar>
          <h1 className="text-xl font-semibold">Sam AI Assistant</h1>
        </div>

        <div className="flex items-center space-x-2">
          <ProfileDropdown
            isLoggedIn={isLoggedIn}
            userName={isLoggedIn ? "John Doe" : "Guest User"}
            userEmail={
              isLoggedIn ? "john.doe@example.com" : "guest@example.com"
            }
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ChatContainer />
      </main>
    </div>
  );
};

export default Home;
