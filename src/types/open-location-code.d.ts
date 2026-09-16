// The official Google package (google/open-location-code) ships no .d.ts —
// this covers only the one method this codebase actually calls.
declare module 'open-location-code' {
  export class OpenLocationCode {
    encode(latitude: number, longitude: number, codeLength?: number): string;
    decode(code: string): {
      latitudeLo: number;
      longitudeLo: number;
      latitudeHi: number;
      longitudeHi: number;
      latitudeCenter: number;
      longitudeCenter: number;
      codeLength: number;
    };
    isValid(code: string): boolean;
    isShort(code: string): boolean;
    isFull(code: string): boolean;
  }
}
