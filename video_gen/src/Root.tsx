import { Composition, staticFile } from "remotion";
import { audiogramSchema } from "./composition/schema";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { getSubtitles } from "./helpers/fetch-captions";
import { FPS } from "./helpers/ms-to-frame";
import { AudioComposition } from "./composition/Main";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="audio-composition"
        component={AudioComposition}
        width={1280}
        height={720}
        schema={audiogramSchema}
        defaultProps={{
          audioOffsetInSeconds: 0,
          audioFileUrl: staticFile("audio.wav"),
          captions: null,
          captionsFileName: staticFile("captions.json"),
          onlyDisplayCurrentSentence: true,
          captionsTextColor: "rgb(72, 72, 72)",
        }}
        calculateMetadata={async ({ props }) => {
          const captions = await getSubtitles(props.captionsFileName);
          const durationInSeconds = await getAudioDurationInSeconds(
            props.audioFileUrl,
          );

          return {
            durationInFrames: Math.floor(
              (durationInSeconds - props.audioOffsetInSeconds) * FPS,
            ),
            props: {
              ...props,
              captions,
            },
            fps: FPS,
          };
        }}
      />
    </>
  );
};
