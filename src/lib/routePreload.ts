const routePreloaders: Record<string, () => Promise<unknown>> = {
  "/family-carpools": () => import("@/pages/FamilyCarpools"),
  "/my-rides": () => import("@/pages/MyRides"),
  "/profile": () => import("@/pages/Profile"),
  "/settings": () => import("@/pages/Settings"),
  "/series": () => import("@/pages/Series"),
};

const preloadedRoutes = new Set<string>();

export function preloadRoute(path: string) {
  const preloader = routePreloaders[path];

  if (!preloader || preloadedRoutes.has(path)) {
    return;
  }

  preloadedRoutes.add(path);

  void preloader().catch(() => {
    preloadedRoutes.delete(path);
  });
}