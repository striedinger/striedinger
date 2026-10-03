import type { PodcastMessages } from "./types";

export interface PodcastCategory {
  colorClassName: string;
  label: string;
  searchTerm: string;
}

/** Categories shown on the Search tab, each tinted like the Podcasts category tiles. */
export function getPodcastCategories(messages: PodcastMessages): PodcastCategory[] {
  return [
    { label: messages.Comedy, searchTerm: "comedy", colorClassName: "bg-[#e0533d]" },
    { label: messages.News, searchTerm: "news", colorClassName: "bg-[#2f6fd6]" },
    { label: messages["True Crime"], searchTerm: "true crime", colorClassName: "bg-[#3d3d42]" },
    { label: messages.Sports, searchTerm: "sports", colorClassName: "bg-[#1f9a5b]" },
    { label: messages.Business, searchTerm: "business", colorClassName: "bg-[#c5862b]" },
    {
      label: messages["Society & Culture"],
      searchTerm: "society culture",
      colorClassName: "bg-[#8e44ad]",
    },
    { label: messages.History, searchTerm: "history", colorClassName: "bg-[#9a6b3f]" },
    {
      label: messages["Health & Fitness"],
      searchTerm: "health fitness",
      colorClassName: "bg-[#d9487a]",
    },
    { label: messages.Technology, searchTerm: "technology", colorClassName: "bg-[#4256c9]" },
    { label: messages.Science, searchTerm: "science", colorClassName: "bg-[#169bb8]" },
    { label: messages.Education, searchTerm: "education", colorClassName: "bg-[#e07c2d]" },
    { label: messages.Arts, searchTerm: "arts", colorClassName: "bg-[#b5446e]" },
    { label: messages["TV & Film"], searchTerm: "tv film", colorClassName: "bg-[#5a4bd1]" },
    { label: messages.Music, searchTerm: "music", colorClassName: "bg-[#e5455e]" },
    { label: messages["Kids & Family"], searchTerm: "kids family", colorClassName: "bg-[#2eaa8a]" },
    { label: messages.Fiction, searchTerm: "fiction", colorClassName: "bg-[#6d5cae]" },
  ];
}
