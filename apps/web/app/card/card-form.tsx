"use client";

import type { FormEvent } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Text } from "@workspace/ui/components/text";
import { useRouter } from "next/navigation";

interface CardFormProps {
  defaultImage: string;
  defaultTitle: string;
  defaultUrl: string;
}

export function CardForm({ defaultImage, defaultTitle, defaultUrl }: CardFormProps) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parameters = new URLSearchParams();

    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value !== "string") {
        continue;
      }

      const text = value.trim();

      if (text) {
        parameters.set(key, text);
      }
    }

    router.push(`/card?${parameters.toString()}`);
  }

  return (
    <form method="get" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="card-url" className="flex flex-col gap-2">
        <Text as="span" size="sm" weight="medium">
          Website to show
        </Text>
        <Input
          id="card-url"
          name="url"
          type="url"
          required
          defaultValue={defaultUrl}
          placeholder="https://example.com/article"
        />
      </label>
      <label htmlFor="card-title" className="flex flex-col gap-2">
        <Text as="span" size="sm" weight="medium">
          Custom title (optional)
        </Text>
        <Input
          id="card-title"
          name="title"
          type="text"
          defaultValue={defaultTitle}
          placeholder="The site's own title if empty"
        />
      </label>
      <label htmlFor="card-image" className="flex flex-col gap-2">
        <Text as="span" size="sm" weight="medium">
          Custom image URL (optional)
        </Text>
        <Input
          id="card-image"
          name="image"
          type="url"
          defaultValue={defaultImage}
          placeholder="The site's own image if empty"
        />
      </label>
      <Button type="submit" className="self-start">
        Create link
      </Button>
    </form>
  );
}
