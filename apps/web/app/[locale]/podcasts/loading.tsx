import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { podcastsFrameClassName } from "./podcasts-frame";
import { PodcastsSkeleton } from "./podcasts-skeleton";

export default function PodcastsLoading() {
  return (
    <IosAppFrame className={podcastsFrameClassName}>
      <PodcastsSkeleton />
    </IosAppFrame>
  );
}
