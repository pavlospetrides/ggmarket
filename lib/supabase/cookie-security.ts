type CookieName = { name: string };

export function getSupabaseCookieOptions(environment = process.env.NODE_ENV) {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: false,
    secure: environment === "production",
  };
}

export function hasSupabaseAuthStorageCookie(cookies: CookieName[]) {
  return cookies.some(({ name }) =>
    /^sb-.+-auth-token(?:-code-verifier)?(?:\.\d+)?$/.test(name),
  );
}

export function withPrivateNoStore<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
