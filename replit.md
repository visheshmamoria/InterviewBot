# Interview AI - Voice-Enabled Multilingual Interview System

## Overview

This is a full-stack TypeScript application that provides an AI-powered interview system with voice capabilities. The system conducts interviews in multiple Indian languages for bank sales positions, integrating with AI services for question generation, speech-to-text, text-to-speech, and real-time voice communication.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSockets for live interview sessions
- **Session Management**: PostgreSQL-based session storage

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for type safety across client/server
- **Tables**: 
  - `interviews` - Main interview records with candidate info, scores, transcripts
  - `interview_sessions` - Session data for active interviews

## Key Components

### AI Services Integration
- **OpenAI Service**: GPT-4o for intelligent question generation and evaluation
- **Sarvam AI**: Indian language TTS/STT for multilingual support
- **Vapi Service**: Real-time voice communication with WebSocket integration

### Core Features
- **Interview Management**: Create, start, and end interviews with full lifecycle tracking
- **Voice Communication**: Real-time voice interaction with AI interviewer
- **Multilingual Support**: Support for 10+ Indian languages including Hindi, Bengali, Tamil, Telugu
- **Transcript Generation**: Real-time speech-to-text with conversation logging
- **Interview Evaluation**: AI-powered scoring and feedback generation
- **Dashboard Analytics**: Statistics and performance tracking

### Storage Layer
- **Primary**: PostgreSQL with Drizzle ORM for production
- **Fallback**: In-memory storage implementation for development
- **Session Handling**: PostgreSQL-based session management with connect-pg-simple

## Data Flow

1. **Interview Setup**: User creates interview with candidate details and language preference
2. **AI Integration**: OpenAI generates contextual questions based on interview parameters
3. **Voice Session**: Vapi establishes WebSocket connection for real-time communication
4. **Speech Processing**: Sarvam AI handles speech-to-text and text-to-speech in selected language
5. **Real-time Updates**: WebSocket broadcasts interview progress and transcript updates
6. **Evaluation**: OpenAI processes responses and generates scores and feedback
7. **Storage**: All data persisted to PostgreSQL with proper schema validation

## External Dependencies

### AI Services
- **OpenAI API**: Question generation and interview evaluation using GPT-4o
- **Sarvam AI**: Multilingual TTS/STT for Indian languages
- **Vapi**: Real-time voice communication platform

### Database
- **Neon Database**: PostgreSQL hosting with serverless capabilities
- **Drizzle Kit**: Database migrations and schema management

### Frontend Libraries
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **React Query**: Server state management
- **React Hook Form**: Form handling with validation

## Deployment Strategy

### Development
- **Vite Dev Server**: Hot module replacement for frontend development
- **Node.js**: Direct TypeScript execution with tsx
- **Environment**: Development-specific configurations with runtime error overlay

### Production Build
- **Frontend**: Vite build with optimized bundling
- **Backend**: esbuild for Node.js bundle generation
- **Assets**: Static file serving with Express
- **Database**: Automated migrations with Drizzle

### Environment Configuration
- **Database**: PostgreSQL connection via DATABASE_URL
- **AI Services**: API keys for OpenAI, Sarvam, and Vapi
- **Session**: PostgreSQL session storage configuration

## Changelog

```
Changelog:
- July 08, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```