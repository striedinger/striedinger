import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";

import type { PodcastMessages } from "./types";

interface PodcastSearchProps {
  initialQuery: string;
  messages: PodcastMessages;
}

export function PodcastSearch({ initialQuery, messages }: PodcastSearchProps) {
  return (
    <Surface className="relative z-20 p-3 sm:p-4">
      <form action="/podcasts" className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="podcast-search" className="sr-only">
          {messages["Search"]}
        </label>
        <div className="relative min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
          </span>
          <Input
            id="podcast-search"
            name="q"
            type="search"
            defaultValue={initialQuery}
            minLength={2}
            maxLength={80}
            enterKeyHint="search"
            placeholder={messages["Search shows, people, or topics"]}
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <Button type="submit" size="lg" className="sm:min-w-28">
          {messages["Search"]}
        </Button>
      </form>
    </Surface>
  );
}
