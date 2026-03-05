# Phase 3: Storefront Core - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the storefront core — API client, state management, layout (header/footer/nav), product pages, and auth pages.

**Architecture:** Next.js 16 App Router with TanStack Query for server state, Zustand for client state, react-hook-form + Zod for forms. Mobile-first responsive design with Tailwind CSS 4.

**Tech Stack:** Next.js 16.1.6, React 19, Tailwind CSS 4, TanStack Query, Zustand, react-hook-form, Zod, Framer Motion, Swiper, Lucide React

---

### Task 1: API Client + Providers + Zustand Stores

Set up the fetch-based API client, TanStack Query provider, auth store, cart store, and UI store.

### Task 2: Base UI Components

Build reusable UI primitives: Button, Input, Badge, Card, Modal, Toast, Spinner, Skeleton.

### Task 3: Layout — Header, Footer, Mobile Nav

Build the storefront shell: sticky header with logo/search/nav/cart/user, footer, mobile hamburger drawer, bottom nav bar.

### Task 4: Product Listing & Category Pages

Product grid, product card, filter sidebar/drawer, sort dropdown, pagination.

### Task 5: Product Detail Page

Image gallery, variant selectors, add to cart, accordion sections, reviews display.

### Task 6: Auth Pages

Login, register, forgot password, reset password pages with forms.

### Task 7: Verify Build + Test Navigation
