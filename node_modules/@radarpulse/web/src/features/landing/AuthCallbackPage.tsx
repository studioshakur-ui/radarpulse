// AuthCallbackPage — legacy OTP callback route, now unused.
// Redirects to /login in case of old bookmarks or stale links.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
