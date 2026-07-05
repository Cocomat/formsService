import { User, UserManager, WebStorageStateStore } from "oidc-client-ts";
import { useCallback, useEffect, useState } from "react";

const oidcAuthority = import.meta.env.VITE_OIDC_AUTHORITY ?? "http://127.0.0.1:8080/realms/formularservice";
const oidcClientId = import.meta.env.VITE_OIDC_CLIENT_ID ?? "formularservice-web";

export const userManager = new UserManager({
  authority: oidcAuthority,
  client_id: oidcClientId,
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.localStorage })
});

let signinCallbackPromise: Promise<User | null> | null = null;

export async function getAccessToken() {
  const user = await userManager.getUser();
  if (user?.expired) {
    await userManager.removeUser();
    return null;
  }
  return user?.access_token;
}

export async function restartLogin() {
  await userManager.removeUser();
  await userManager.signinRedirect();
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const login = useCallback(() => userManager.signinRedirect(), []);
  const logout = useCallback(() => userManager.signoutRedirect(), []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
        signinCallbackPromise ??= userManager
          .signinRedirectCallback()
          .then((callbackUser) => {
            window.history.replaceState({}, document.title, window.location.pathname);
            return callbackUser;
          })
          .catch(async (error) => {
            const existing = await userManager.getUser();
            if (existing) {
              window.history.replaceState({}, document.title, window.location.pathname);
              return existing;
            }
            throw error;
          });
        const callbackUser = await signinCallbackPromise;
        if (active) setUser(callbackUser);
        return;
      }
      const existing = await userManager.getUser();
      if (existing?.expired) {
        await userManager.removeUser();
        if (active) setUser(null);
        return;
      }
      if (active) setUser(existing);
    }
    void load();
    const sync = (next: User) => setUser(next);
    const clear = () => setUser(null);
    userManager.events.addUserLoaded(sync);
    userManager.events.addUserUnloaded(clear);
    return () => {
      active = false;
      userManager.events.removeUserLoaded(sync);
      userManager.events.removeUserUnloaded(clear);
    };
  }, []);

  return {
    user,
    login,
    logout
  };
}
