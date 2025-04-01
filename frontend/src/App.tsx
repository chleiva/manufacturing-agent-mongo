import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useRoutes, Routes, Route, useLocation } from "react-router-dom";
import Home from "./components/home";
import routes from "tempo-routes";

const COGNITO_DOMAIN = "https://us-east-1c7yjkmg3f.auth.us-east-1.amazoncognito.com";
const CLIENT_ID = "2fvd6tbv3a46rlu3shr14oj93b";
const REDIRECT_URI = "https://mongoagent.com"; // or your dev URL
const RESPONSE_TYPE = "code";
const SCOPE = "openid email profile";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);



  useEffect(() => {
    const isTokenExpired = (token) => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.exp * 1000 < Date.now();
      } catch (e) {
        return true;
      }
    };
  
    const refreshAccessToken = async (refreshToken) => {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      });
  
      const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body,
      });
  
      const tokens = await response.json();
  
      if (tokens.id_token) {
        localStorage.setItem("id_token", tokens.id_token);
        if (tokens.refresh_token) {
          localStorage.setItem("refresh_token", tokens.refresh_token);
        }
        return true;
      }
      return false;
    };
  
    const initAuth = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
  
      // First, check local tokens
      const idToken = localStorage.getItem("id_token");
      const refreshToken = localStorage.getItem("refresh_token");
  
      if (idToken && !isTokenExpired(idToken)) {
        setIsAuthenticated(true);
        return;
      }
  
      if (refreshToken) {
        const success = await refreshAccessToken(refreshToken);
        if (success) {
          setIsAuthenticated(true);
          return;
        } else {
          localStorage.removeItem("id_token");
          localStorage.removeItem("refresh_token");
        }
      }
  
      // Then try exchanging the code (only if present)
      if (code) {
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          client_id: CLIENT_ID,
          code: code,
          redirect_uri: REDIRECT_URI,
        });
  
        const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body,
        });
  
        const tokens = await response.json();
  
        if (tokens.id_token) {
          localStorage.setItem("id_token", tokens.id_token);
          if (tokens.refresh_token) {
            localStorage.setItem("refresh_token", tokens.refresh_token);
          }
          setIsAuthenticated(true);
        }
  
        // Always clean the URL (very important!)
        window.history.replaceState({}, document.title, "/");
      }
    };
  
    initAuth();
  }, [location]);
  
  

  const login = () => {
    const loginUrl = `${COGNITO_DOMAIN}/oauth2/authorize?response_type=${RESPONSE_TYPE}&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${encodeURIComponent(SCOPE)}`;
    window.location.href = loginUrl;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <button
          onClick={login}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg hover:bg-blue-700"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={<p>Loading...</p>}>
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </main>
      </Suspense>
    </div>
  );
  
}

export default App;
