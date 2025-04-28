import React from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";

import { PaginatedCaptions } from "./caption/Captions";
import {
  BASE_SIZE,
  CAPTIONS_FONT_SIZE,
  CAPTIONS_FONT_WEIGHT,
  LINE_HEIGHT,
  LINES_PER_PAGE,
} from "./constants";
import { FONT_FAMILY } from "./font/font";
import { WaitForFonts } from "./font/WaitForFonts";
import { AudiogramCompositionSchemaType } from "./schema";
import { Shader } from "./shader/shader";

export const AudioComposition: React.FC<AudiogramCompositionSchemaType> = ({
  audioFileUrl,
  captionsTextColor,
  onlyDisplayCurrentSentence,
  audioOffsetInSeconds,
  captions,
}) => {
  const { durationInFrames, fps, width } = useVideoConfig();

  if (!captions) {
    throw new Error(
      "subtitles should have been provided through calculateMetadata",
    );
  }
  const audioOffsetInFrames = Math.round(audioOffsetInSeconds * fps);

  const textBoxWidth = width - BASE_SIZE * 2 - 48;



  return (
    <AbsoluteFill>
      <Sequence from={-audioOffsetInFrames}>
        <Audio pauseWhenBuffering src={audioFileUrl} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            color: "white",
            padding: "48px",
            backgroundColor: "black",
            fontFamily: FONT_FAMILY,
            alignItems: "center",
          }}
        >
          <Shader />
  
          <WaitForFonts>
            <div
              style={{
                lineHeight: `${LINE_HEIGHT}px`,
                width: textBoxWidth,
                fontWeight: CAPTIONS_FONT_WEIGHT,
                fontSize: CAPTIONS_FONT_SIZE,
                marginTop: "260px",
              }}
            >
              <PaginatedCaptions
                captions={captions}
                startFrame={0}
                endFrame={audioOffsetInFrames + durationInFrames}
                linesPerPage={LINES_PER_PAGE}
                subtitlesTextColor={captionsTextColor}
                onlyDisplayCurrentSentence={onlyDisplayCurrentSentence}
                textBoxWidth={textBoxWidth}
              />
            </div>
          </WaitForFonts>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
