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
    // Check if we already have an ID token stored
    const idToken = localStorage.getItem("id_token");
    if (idToken) {
      setIsAuthenticated(true);
      return;
    }

    // Otherwise, see if we've just returned from Cognito with a code
    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    if (code) {
      const exchangeCode = async () => {
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
          setIsAuthenticated(true);

          // Clean URL: remove the ?code param
          window.history.replaceState({}, document.title, "/");
        }
      };

      exchangeCode();
    }
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
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;
