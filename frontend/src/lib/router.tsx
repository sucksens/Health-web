import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"

interface RouterContextType {
  path: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextType>({
  path: typeof window !== "undefined" ? window.location.pathname : "/",
  navigate: () => {},
})

export function useRouter() {
  return useContext(RouterContext)
}

export function useNavigate() {
  const { navigate } = useRouter()
  return navigate
}

export function usePath() {
  const { path } = useRouter()
  return path
}

interface NavLinkProps {
  to: string
  children: ReactNode
  className?: string | ((props: { isActive: boolean }) => string)
}

export function NavLink({ to, children, className }: NavLinkProps) {
  const { path, navigate } = useRouter()
  const isActive = path === to || (to !== "/" && path.startsWith(to))

  const cls =
    typeof className === "function" ? className({ isActive }) : className

  return (
    <a
      href={to}
      className={cls}
      onClick={(e) => {
        e.preventDefault()
        navigate(to)
      }}
    >
      {children}
    </a>
  )
}

export function AppRouter({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  )

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, "", to)
    setPath(to)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}
