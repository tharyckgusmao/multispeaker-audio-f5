import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useWindowedAudioDataIfPossible } from '../helpers/use-windowed-audio-data-if-possible';
import { useAudioData, visualizeAudio, visualizeAudioWaveform } from '@remotion/media-utils';

const useAudioVisualization = (audioFileUrl:string) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const audioData = useAudioData(audioFileUrl);

  if(!audioData){
    return 0
  }


  const waveform = visualizeAudioWaveform({
    fps,
    frame,
    audioData,
    numberOfSamples: 1,
    windowInSeconds: 42 / fps,
  });
  
  

  return Math.abs(waveform[0]??0);
};

export default useAudioVisualization;
