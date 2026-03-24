// src/test/mocks/next-navigation.ts
// Mock Next.js navigation hooks for component tests
import { vi } from 'vitest'

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}

export const mockPathname = '/'
export const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  redirect: vi.fn(),
}))
