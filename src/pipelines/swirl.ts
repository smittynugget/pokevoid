import { Game } from "phaser";

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uAngle;
uniform float uStrength;

varying vec2 outTexCoord;

void main() {
    vec2 uv = outTexCoord - uCenter;
    float dist = length(uv);
    float falloff = 1.0 - smoothstep(0.0, uRadius, dist);
    float twist = uAngle * falloff * uStrength;
    float c = cos(twist + uTime);
    float s = sin(twist + uTime);
    vec2 rotated = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    vec2 sampleUv = rotated + uCenter;

    if (sampleUv.x < 0.0 || sampleUv.x > 1.0 || sampleUv.y < 0.0 || sampleUv.y > 1.0) {
        gl_FragColor = vec4(0.0);
    } else {
        gl_FragColor = 1.0 - texture2D(uMainSampler, sampleUv);
    }
}
`;

export default class SwirlPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _center: [number, number] = [0.5, 0.5];
  private _radius = 0.5;
  private _angle = 3.14159;
  private _strength = 1.0;

  constructor(game: Game) {
    super({
      game,
      name: "SwirlPostFX",
      fragShader,
      uniforms: [
        "uMainSampler",
        "uTime",
        "uCenter",
        "uRadius",
        "uAngle",
        "uStrength"
      ]
    } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }

  onPreRender(): void {
    this.set1f("uTime", this.game.getTime() * 0.0001);
    this.set2f("uCenter", this._center[0], this._center[1]);
    this.set1f("uRadius", this._radius);
    this.set1f("uAngle", this._angle);
    this.set1f("uStrength", this._strength);
  }

  setCenter(x: number, y: number): void {
    this._center = [x, y];
  }

  setRadius(r: number): void {
    this._radius = r;
  }

  setAngle(a: number): void {
    this._angle = a;
  }

  setStrength(s: number): void {
    this._strength = s;
  }
}