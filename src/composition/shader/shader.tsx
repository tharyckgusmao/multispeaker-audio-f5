import { useEffect, useRef } from "react";
import regl from 'regl';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// const colorTimeline = [
//     { time: 5, backgroundColor: [.984, 0.984, 0.984], sphereColor: [1.0, 0.6, 0.0,] },
//     { time: 8, backgroundColor: [0.0, 0.02, 0.1], sphereColor: [0.1, 0.6, 0.8] },
//     { time: 15, backgroundColor: [0.01, 0.1, 0.02], sphereColor: [0.0, 1.0, 0.5] },
//     { time: 22, backgroundColor: [0.01, 0.1, 0.02], sphereColor: [0.0, 1.0, 0.5] },
//     { time: 29, backgroundColor: [0.01, 0.1, 0.02], sphereColor: [0.0, 1.0, 0.5] },
//     // { time: 36, backgroundColor: [.984, 0.984, 0.984], sphereColor: [1.0, 0.6, 0.0,] },


// ];

const voiceTimeline = [
    { startTimeMs: 160, endTimeMs: 5680 },
    { startTimeMs: 7000, endTimeMs: 13180 },
    { startTimeMs: 15120, endTimeMs: 20880 },
    { startTimeMs: 22060, endTimeMs: 27080 },
    { startTimeMs: 29400, endTimeMs: 34600 },
    { startTimeMs: 36700, endTimeMs: 42380 },
];
const colorTimeline = [
    { backgroundColor: [0.96, 0.98, 0.99], sphereColor: [0.4, 0.7, 0.9] },

    { backgroundColor: [0.99, 0.97, 0.95], sphereColor: [1.0, 0.7, 0.4] },

    { backgroundColor: [0.99, 0.97, 0.98], sphereColor: [0.95, 0.6, 0.75] },

    { backgroundColor: [0.97, 0.99, 0.97], sphereColor: [0.5, 0.85, 0.6] },

    { backgroundColor: [0.98, 0.97, 0.99], sphereColor: [0.7, 0.5, 0.9] },

    { backgroundColor: [0.99, 0.96, 0.96], sphereColor: [0.95, 0.3, 0.3] }
];

const colorsAndVoiceTimeline = voiceTimeline.map((e, i) => {
    return { ...e, ...colorTimeline[i] };
});

export const Shader = () => {
    const el = useRef<HTMLCanvasElement>(null);
    const frame = useCurrentFrame();
    const { width, height, fps } = useVideoConfig();
    //   const audioVisualization = useAudioVisualization(audioFileUrl);

    const timeRef = useRef(0);
    const speedRef = useRef(0.1);
    const lastInSpeech = useRef(false);




    const getInterpolatedColor = (t: number, factor: "backgroundColor" | "sphereColor") => {
        const timeMs = t * 1000;
        const transitionDuration = 500;

        let currentIndex = -1;
        for (let i = 0; i < colorsAndVoiceTimeline.length; i++) {
            if (timeMs >= colorsAndVoiceTimeline[i].startTimeMs) {
                currentIndex = i;
            }
        }

        if (currentIndex === -1) {
            return colorsAndVoiceTimeline[0][factor];
        }

        const current = colorsAndVoiceTimeline[currentIndex];
        const next = colorsAndVoiceTimeline[currentIndex + 1];

        if (!next || timeMs < current.startTimeMs + transitionDuration) {
            return current[factor];
        }

        const nextTransitionStart = next.startTimeMs - transitionDuration;

        if (timeMs >= nextTransitionStart && timeMs <= next.startTimeMs) {
            const progress = (timeMs - nextTransitionStart) / transitionDuration;
            const smoothProgress = Math.sin(progress * Math.PI / 2);
            return current[factor].map((c, idx) =>
                c * (1 - smoothProgress) + next[factor][idx] * smoothProgress
            ) as [number, number, number];
        }

        return current[factor];
    };

    const isInSpeechInterval = (currentTimeMs: number) => {
        return voiceTimeline.some(interval =>
            currentTimeMs >= interval.startTimeMs && currentTimeMs <= interval.endTimeMs
        );
    };

    useEffect(() => {
        if (el.current) {
            const r = regl(el.current);






            const realTime = frame / fps;
            const inSpeech = isInSpeechInterval(realTime * 1000);

            const targetSpeed = inSpeech ? 0.9 : 0.1;

            if (inSpeech !== lastInSpeech.current) {
                timeRef.current = timeRef.current;
                lastInSpeech.current = inSpeech;
            }
            speedRef.current = speedRef.current + (targetSpeed - speedRef.current) * 0.2;
            timeRef.current += speedRef.current * (1 / fps);


            const bgColor = getInterpolatedColor(realTime, "backgroundColor");
            const sphereColor = getInterpolatedColor(realTime, "sphereColor")
            let newTime = timeRef.current;

            r.clear({ color: [0, 0, 0, 1], depth: 1 });

            r({
                frag: `
          precision mediump float;

          #define MAX_RAY_MARCH_STEPS 32
          #define MAX_DISTANCE 1.0
          #define SURFACE_DISTANCE 0.06

          uniform float iTime;
          uniform vec2 iResolution;
          uniform vec3 backgroundColor;
          uniform vec3 sphereColor;

          struct Hit {
              float dist;
              float closest_dist;
              vec3 p;
          };

          float specularBlinnPhong(vec3 light_dir, vec3 ray_dir, vec3 normal) {
              vec3 halfway = normalize(light_dir + ray_dir);
              return max(0.0, dot(normal, halfway));
          }

          vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 250.0)) * 250.0; }
          vec4 perm(vec4 x){ return mod289(((x * 8.0) + 1.0) * x); }

          float noise(vec3 p) {
              vec3 a = floor(p);
              vec3 d = p - a;
              d = d * d * (3.0 - 2.0 * d);

              vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
              vec4 k1 = perm(b.xyxy);
              vec4 k2 = perm(k1.xyxy + b.zzww);

              vec4 c = k2 + a.zzzz;
              vec4 k3 = perm(c);
              vec4 k4 = perm(c + 1.);

              vec4 o1 = fract(k3 * (1.0 / 41.0));
              vec4 o2 = fract(k4 * (1.0 / 41.0));

              vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
              vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

              return o4.y * d.y + o4.x * (1.0 - d.y);
          }

          float SDF(vec3 point) {
              vec3 p = vec3(point.xy, iTime + point.z * 0.8);
              float n = (noise(p) + noise(p * 2.0) * 0.5 + noise(p * 4.0) * 0.25) * 0.57;
              return length(point) - 0.35 - n * 0.3;
          }

          vec3 getNormal(vec3 point) {
              vec2 e = vec2(0.05, 0.0);
              return normalize(SDF(point) - vec3(
                  SDF(point - e.xyy),
                  SDF(point - e.yxy),
                  SDF(point - e.yyx)
              ));
          }

          Hit raymarch(vec3 p, vec3 d) {
              Hit hit;
              hit.dist = 0.0;
              hit.closest_dist = MAX_DISTANCE;
              for (int i = 0; i < MAX_RAY_MARCH_STEPS; ++i) {
                  float sdf = SDF(p);
                  p += d * sdf;
                  hit.closest_dist = min(hit.closest_dist, sdf);
                  hit.dist += sdf;
                  if (hit.dist >= MAX_DISTANCE || abs(sdf) <= SURFACE_DISTANCE)
                      break;
              }
              hit.p = p;
              return hit;
          }

          void main () {
              vec2 fragCoord = gl_FragCoord.xy;
              vec2 uv = (fragCoord * 1.1 - iResolution.xy) / iResolution.y;
              vec4 fragColor = vec4(backgroundColor, 1.0);

              if (dot(uv, uv) > 1.0) {
                  gl_FragColor = fragColor;
                  return;
              }

              vec3 pos = vec3(0.0, 0.0, -1.0);
              vec3 dir = normalize(vec3(uv, .8));
              Hit hit = raymarch(pos, dir);

              if (hit.closest_dist >= SURFACE_DISTANCE) {
                  gl_FragColor = fragColor;
                  return;
              }

              vec3 normal = getNormal(hit.p);
              vec3 ray_dir = normalize(pos - hit.p);

              float facing = max(0.5, sqrt(dot(normal, vec3(1, 1, 1))) * 2.0 - dot(normal, -dir));
              fragColor = mix(vec4(1), vec4(sphereColor, 1.0), 0.75 * facing * facing * facing* facing);
              

              vec2 shadowDir = normalize(vec2(1.0, 0.9)); 
                vec2 offset = hit.p.xz + shadowDir * 0.2; 
                float shadow = smoothstep(0.0, 0.4, length(offset));
                fragColor.rgb = mix(sphereColor, fragColor.rgb, shadow);

              vec3 adjustedSpecularColor = vec3(.4) - (sphereColor * 0.2); 

              fragColor += mix(vec4(0.0), vec4(adjustedSpecularColor,1.0),
                  pow(specularBlinnPhong(normalize(vec3(-600, -800, 0) - hit.p), ray_dir, normal), 5.0) * -0.7);

              gl_FragColor = fragColor;
          }`,

                vert: `
          precision mediump float;
          attribute vec2 position;
          void main() {
              gl_Position = vec4(position, 0, 1);
          }`,

                attributes: {
                    position: [
                        [-1, -1],
                        [1, -1],
                        [-1, 1],
                        [-1, 1],
                        [1, -1],
                        [1, 1]
                    ]
                },
                uniforms: {
                    iTime: () => newTime,
                    iResolution: () => [width, height],
                    backgroundColor: () => bgColor,
                    sphereColor: () => sphereColor
                },
                count: 6
            })();
        }
    }, [frame, height, width, fps]);

    return (
        <AbsoluteFill>
            <canvas ref={el} width={width} height={height} />
        </AbsoluteFill>
    );
};
