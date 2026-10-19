import { Link } from '@heroui/react'
import { createLink } from '@tanstack/react-router'

/**
 * HeroUI Link with TanStack Router navigation, typed routes and preloading.
 * Pattern from TanStack Router's "createLink with React Aria Components" guide;
 * HeroUI's Link is built on React Aria's Link.
 */
export const RouterLink = createLink(Link)
