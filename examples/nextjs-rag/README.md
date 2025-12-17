# Lumina Next.js Chat Demo

A professional demonstration chat application built with Next.js and Vercel AI SDK, designed to showcase chat interfaces that can be instrumented with the Lumina observability SDK.

## Features

- 💬 Interactive chat interface using Vercel AI SDK
- 🎨 Modern, responsive UI with smooth animations
- 🔄 Streaming responses for real-time chat experience
- ♿ Full accessibility support with ARIA attributes
- 🎯 Ready for Lumina SDK instrumentation
- 🚀 Built with Next.js 16 App Router
- 📝 TypeScript with strict type checking
- 🎨 ESLint & Prettier configured
- 🏗️ Professional code organization

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Optional: OpenAI API key (for real AI responses)

### Installation

1. Install dependencies:

```bash
bun install
```

2. (Optional) Configure environment variables:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=your-api-key-here
```

> **Note:** The app works without an API key in demo mode, returning mock responses.

### Running the Application

Start the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
examples/nextjs-rag/
├── app/                       # Next.js App Router
│   ├── api/
│   │   └── chat/
│   │       └── route.ts       # Chat API endpoint with streaming
│   ├── layout.tsx             # Root layout with metadata
│   ├── page.tsx               # Home page
│   └── globals.css            # Global styles
├── components/                # React components
│   ├── Chat.tsx               # Main chat component (accessible)
│   └── Chat.module.css        # Chat component styles
├── lib/                       # Shared utilities
│   └── constants.ts           # App configuration and constants
├── types/                     # TypeScript type definitions
│   └── index.ts               # Shared types (Message, ApiError, etc.)
├── .env.example               # Environment variables template
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── next.config.mjs            # Next.js configuration
```

## How It Works

### Chat Interface

The chat interface ([components/Chat.tsx](components/Chat.tsx)) is built using the `useChat` hook from Vercel AI SDK. Features include:

- Message state management
- Automatic streaming support
- Form handling and validation
- Loading states with visual feedback
- Full accessibility with ARIA labels and semantic HTML
- Auto-scroll to latest message
- Input validation and character limits

### API Route

The `/api/chat` endpoint ([app/api/chat/route.ts](app/api/chat/route.ts)) handles chat requests with:

- **Edge Runtime:** Optimized for low latency
- **Demo Mode:** Works without API key (mock streaming responses)
- **Production Mode:** Integrates with OpenAI GPT-3.5-turbo
- **Error Handling:** Comprehensive error handling and logging
- **Type Safety:** Fully typed requests and responses
- **Validation:** Input validation and sanitization

### Streaming Responses

Both modes support streaming responses for a smooth user experience:

- Real-time text generation
- Progressive rendering
- Natural conversation flow

## Lumina SDK Integration (Coming Soon)

Once the `@lumina/sdk` package is built, this demo will showcase:

- **Conversation Tracking:** Monitor all chat interactions
- **Performance Metrics:** Measure response times and throughput
- **Usage Analytics:** Track token usage and costs
- **Error Monitoring:** Capture and analyze errors
- **Custom Events:** Log application-specific events

## Development

### Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Fix ESLint errors automatically
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check code formatting
- `bun run type-check` - Run TypeScript type checking

### Code Quality

This project follows professional development practices:

- **TypeScript:** Strict type checking enabled
- **ESLint:** Next.js recommended rules + custom rules
- **Prettier:** Consistent code formatting
- **Accessibility:** WCAG 2.1 Level AA compliance
- **Error Handling:** Comprehensive error boundaries
- **Documentation:** JSDoc comments for complex functions

### Customization

The application can be customized by modifying:

- **Styles:** Edit `components/Chat.module.css` and `app/globals.css`
- **Configuration:** Update `lib/constants.ts` for app-wide settings
- **Types:** Extend types in `types/index.ts`
- **Components:** Modify `components/Chat.tsx`
- **API Logic:** Update `app/api/chat/route.ts`

## Technologies

- **Framework:** Next.js 16 (App Router)
- **AI SDK:** Vercel AI SDK (`ai`)
- **AI Model:** OpenAI GPT-3.5-turbo
- **Runtime:** Node.js / Bun
- **Styling:** CSS Modules
- **Language:** TypeScript

## License

This is part of the Lumina project. See the main repository for license information.

## Next Steps

1. Build the `@lumina/sdk` package
2. Instrument this chat application with Lumina
3. Add more advanced features (RAG, function calling, etc.)
4. Deploy to production

## Support

For issues or questions, please refer to the main Lumina repository.
