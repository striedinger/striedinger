import { IosAppFrame } from "../../components/ios/ios-app-frame";

export default function PodcastsLoading() {
  return (
    <IosAppFrame aria-busy="true" className="[--ios-tint:#9440d8] dark:[--ios-tint:#c47bf5]">
      <div className="size-full bg-(--ios-background)" />
    </IosAppFrame>
  );
}
