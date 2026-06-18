import {
  createContext,
  useEffect,
  useState,
} from "react";

import api from "../api/api";

export const AuthContext = createContext();


function AuthProvider({
  children
}) {

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [mediaVersion, setMediaVersion] =
    useState(0);


  const getToken = () => {

    return (
      localStorage.getItem("token")
      ||
      sessionStorage.getItem("token")
    );

  };


  const login = async (
  token,
  rememberMe = false
) => {

  if (rememberMe) {

    localStorage.setItem(
      "token",
      token
    );

  } else {

    sessionStorage.setItem(
      "token",
      token
    );

  }

  try {

    const response =
      await api.get("/auth/me", {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      });

    setUser(response.data);

  } catch (error) {

    logout();

  }

};


  const logout = () => {

    localStorage.removeItem("token");

    sessionStorage.removeItem("token");

    setUser(null);

  };


  const refreshUser = async () => {
    const token = getToken();

    if (!token) {
      return null;
    }

    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
      setMediaVersion(Date.now());
      return response.data;
    } catch (_) {
      logout();
      return null;
    }
  };


  const checkAuth = async () => {

    const token = getToken();

    if (!token) {

      setLoading(false);

      return;

    }

    try {
      await refreshUser();
    } catch (error) {
      logout();
    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    checkAuth();

  }, []);


  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        getToken,
        refreshUser,
        mediaVersion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;