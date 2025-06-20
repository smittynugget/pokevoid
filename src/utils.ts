import i18next from "i18next";
import { MoneyFormat } from "#enums/money-format";

export const MissingTextureKey = "__MISSING";

export function toReadableString(str: string): string {
  return str.replace(/\_/g, " ").split(" ").map(s => `${s.slice(0, 1)}${s.slice(1).toLowerCase()}`).join(" ");
}

export function randomString(length: integer, seeded: boolean = false) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = seeded ? randSeedInt(characters.length) : Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
}

export function shiftCharCodes(str: string, shiftCount: integer) {
  if (!shiftCount) {
    shiftCount = 0;
  }

  let newStr = "";

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const newCharCode = charCode + shiftCount;
    newStr += String.fromCharCode(newCharCode);
  }

  return newStr;
}

export function clampInt(value: integer, min: integer, max: integer): integer {
  return Math.min(Math.max(value, min), max);
}

export function randGauss(stdev: number, mean: number = 0): number {
  if (!stdev) {
    return 0;
  }
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

export function randSeedGauss(stdev: number, mean: number = 0): number {
  if (!stdev) {
    return 0;
  }
  const u = 1 - Phaser.Math.RND.realInRange(0, 1);
  const v = Phaser.Math.RND.realInRange(0, 1);
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

export function padInt(value: integer, length: integer, padWith?: string): string {
  if (!padWith) {
    padWith = "0";
  }
  let valueStr = value.toString();
  while (valueStr.length < length) {
    valueStr = `${padWith}${valueStr}`;
  }
  return valueStr;
}

/**
 * Returns a random integer between min and min + range
 * @param range The amount of possible numbers
 * @param min The starting number
 */
export function randInt(range: integer, min: integer = 0): integer {
  if (range === 1) {
    return min;
  }
  return Math.floor(Math.random() * range) + min;
}

export function randSeedInt(range: integer, min: integer = 0): integer {
  if (range <= 1) {
    return min;
  }
  return Phaser.Math.RND.integerInRange(min, (range - 1) + min);
}

/**
 * Returns a random integer between min and max (non-inclusive)
 * @param min The lowest number
 * @param max The highest number
 */
export function randIntRange(min: integer, max: integer): integer {
  return randInt(max - min, min);
}

export function randItem<T>(items: T[]): T {
  return items.length === 1
      ? items[0]
      : items[randInt(items.length)];
}

export function randSeedItem<T>(items: T[]): T {
  if (items.length === 1) {
    return items[0];
  }

  if (typeof Phaser !== 'undefined' && Phaser.Math && Phaser.Math.RND && Phaser.Math.RND.pick) {
    const picked = Phaser.Math.RND.pick(items);
    if (picked !== undefined) {
      return picked;
    }
  }

  const index = randSeedInt(items.length)
  let result = items[index];

  if(!result) {
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }
}

export function randSeedWeightedItem<T>(items: T[]): T {
  return items.length === 1
      ? items[0]
      : Phaser.Math.RND.weightedPick(items);
}

export function randSeedEasedWeightedItem<T>(items: T[], easingFunction: string = "Sine.easeIn"): T | null {
  if (!items.length) {
    return null;
  }
  if (items.length === 1) {
    return items[0];
  }
  const value = Phaser.Math.RND.realInRange(0, 1);
  const easedValue = Phaser.Tweens.Builders.GetEaseFunction(easingFunction)(value);
  return items[Math.floor(easedValue * items.length)];
}

/**
 * Shuffle a list using the seeded rng. Utilises the Fisher-Yates algorithm.
 * @param {Array} items An array of items.
 * @returns {Array} A new shuffled array of items.
 */
export function randSeedShuffle<T>(items: T[]): T[] {
  if (items.length <= 1) {
    return items;
  }
  const newArray = items.slice(0);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Phaser.Math.RND.integerInRange(0, i);
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function getFrameMs(frameCount: integer): integer {
  return Math.floor((1 / 60) * 1000 * frameCount);
}

export function getCurrentTime(): number {
  const date = new Date();
  return (((date.getHours() * 60 + date.getMinutes()) / 1440) + 0.675) % 1;
}

const secondsInHour = 3600;

export function getPlayTimeString(totalSeconds: integer): string {
  const days = `${Math.floor(totalSeconds / (secondsInHour * 24))}`;
  const hours = `${Math.floor(totalSeconds % (secondsInHour * 24) / secondsInHour)}`;
  const minutes = `${Math.floor(totalSeconds % secondsInHour / 60)}`;
  const seconds = `${Math.floor(totalSeconds % 60)}`;

  return `${days.padStart(2, "0")}:${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
}

/**
 * Generates IVs from a given {@linkcode id} by extracting 5 bits at a time
 * starting from the least significant bit up to the 30th most significant bit.
 * @param id 32-bit number
 * @returns An array of six numbers corresponding to 5-bit chunks from {@linkcode id}
 */
export function getIvsFromId(id: number): number[] {
  return [
    (id & 0x3E000000) >>> 25,
    (id & 0x01F00000) >>> 20,
    (id & 0x000F8000) >>> 15,
    (id & 0x00007C00) >>> 10,
    (id & 0x000003E0) >>> 5,
    (id & 0x0000001F)
  ];
}

export function formatLargeNumber(count: integer, threshold: integer): string {
  if (count < threshold) {
    return count.toString();
  }
  const ret = count.toString();
  let suffix = "";
  switch (Math.ceil(ret.length / 3) - 1) {
    case 1:
      suffix = "K";
      break;
    case 2:
      suffix = "M";
      break;
    case 3:
      suffix = "B";
      break;
    case 4:
      suffix = "T";
      break;
    case 5:
      suffix = "q";
      break;
    default:
      return "?";
  }
  const digits = ((ret.length + 2) % 3) + 1;
  let decimalNumber = ret.slice(digits, digits + 2);
  while (decimalNumber.endsWith("0")) {
    decimalNumber = decimalNumber.slice(0, -1);
  }
  return `${ret.slice(0, digits)}${decimalNumber ? `.${decimalNumber}` : ""}${suffix}`;
}

// Abbreviations from 10^0 to 10^33
const AbbreviationsLargeNumber: string[] = ["", "K", "M", "B", "t", "q", "Q", "s", "S", "o", "n", "d"];

export function formatFancyLargeNumber(number: number, rounded: number = 3): string {
  if (typeof number !== 'number' || isNaN(number) || !isFinite(number)) {
    return "0";
  }
  
  let exponent: number;

  if (number < 1000) {
    exponent = 0;
  } else {
    const maxExp = AbbreviationsLargeNumber.length - 1;

    exponent = Math.floor(Math.log(number) / Math.log(1000));
    exponent = Math.min(exponent, maxExp);

    number /= Math.pow(1000, exponent);
  }

  return `${(exponent === 0) || number % 1 === 0 ? number : number.toFixed(rounded)}${AbbreviationsLargeNumber[exponent]}`;
}

export function formatMoney(format: MoneyFormat, amount: number) {
  if (format === MoneyFormat.ABBREVIATED) {
    return formatFancyLargeNumber(amount);
  }
  return amount.toLocaleString();
}

export function formatStat(stat: integer, forHp: boolean = false): string {
  return formatLargeNumber(stat, forHp ? 100000 : 1000000);
}

export function getEnumKeys(enumType: any): string[] {
  return Object.values(enumType).filter(v => isNaN(parseInt(v!.toString()))).map(v => v!.toString());
}

export function getEnumValues(enumType: any): integer[] {
  return Object.values(enumType).filter(v => !isNaN(parseInt(v!.toString()))).map(v => parseInt(v!.toString()));
}

export function executeIf<T>(condition: boolean, promiseFunc: () => Promise<T>): Promise<T | null> {
  return condition ? promiseFunc() : new Promise<T | null>(resolve => resolve(null));
}

export const sessionIdKey = "pokerogue_sessionId";

export const isLocal = false;


export const localServerUrl = import.meta.env.VITE_SERVER_URL ?? `http://${window.location.hostname}:${window.location.port+1}`;

export const apiUrl = localServerUrl;
export let isLocalServerConnected = true;

export const isBeta = import.meta.env.MODE === "beta";

export function setCookie(cName: string, cValue: string): void {
  const expiration = new Date();
  expiration.setTime(new Date().getTime() + 3600000 * 24 * 30 * 3/*7*/);
  document.cookie = `${cName}=${cValue};Secure;SameSite=Strict;Domain=${window.location.hostname};Path=/;Expires=${expiration.toUTCString()}`;
}

export function removeCookie(cName: string): void {
  if (isBeta) {
    document.cookie = `${cName}=;Secure;SameSite=Strict;Domain=pokerogue.net;Path=/;Max-Age=-1`; // we need to remove the cookie from the main domain as well
  }

  document.cookie = `${cName}=;Secure;SameSite=Strict;Domain=${window.location.hostname};Path=/;Max-Age=-1`;
  document.cookie = `${cName}=;Secure;SameSite=Strict;Path=/;Max-Age=-1`; // legacy cookie without domain, for older cookies to prevent a login loop
}

export function getCookie(cName: string): string {
  if (document.cookie.split(";").filter(c => c.includes(cName)).length > 1) {
    removeCookie(cName);
    return "";
  }
  const name = `${cName}=`;
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

/**
 * When locally running the game, "pings" the local server
 * with a GET request to verify if a server is running,
 * sets isLocalServerConnected based on results
 */
export function localPing() {
  if (isLocal) {
    apiFetch("game/titlestats")
        .then(resolved => isLocalServerConnected = true,
            rejected => isLocalServerConnected = false
        );
  }
}

export function apiFetch(path: string, authed: boolean = false): Promise<Response> {
  return (isLocal && isLocalServerConnected) || !isLocal ? new Promise((resolve, reject) => {
    const request = {};
    if (authed) {
      const sId = getCookie(sessionIdKey);
      if (sId) {
        request["headers"] = { "Authorization": sId };
      }
    }
    fetch(`${apiUrl}/${path}`, request)
        .then(response => resolve(response))
        .catch(err => reject(err));
  }) : new Promise(() => {});
}

export function apiPost(path: string, data?: any, contentType: string = "application/json", authed: boolean = false): Promise<Response> {
  return (isLocal && isLocalServerConnected) || !isLocal ? new Promise((resolve, reject) => {
    const headers = {
      "Accept": contentType,
      "Content-Type": contentType,
    };
    if (authed) {
      const sId = getCookie(sessionIdKey);
      if (sId) {
        headers["Authorization"] = sId;
      }
    }
    fetch(`${apiUrl}/${path}`, { method: "POST", headers: headers, body: data })
        .then(response => resolve(response))
        .catch(err => reject(err));
  }) : new Promise(() => {});
}

import { auth, db } from "#app/server/firebase";
import { doc, getDoc, setDoc, updateDoc, DocumentReference } from "firebase/firestore";
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function refreshIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    await user.getIdToken(true);
    return user.getIdToken();
  } catch (error) {
    console.error("Error refreshing ID token:", error);
    return null;
  }
}

export async function getUserDocument(uid: string) {
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocSnap.data();
  } else {
    throw new Error("User document does not exist.");
  }
}

export async function createUserDocument(uid: string, data: object) {
  await setDoc(doc(db, "users", uid), data);
}

export async function updateUserDocument(uid: string, data: object) {
  await updateDoc(doc(db, "users", uid), data);
}

export function sanitizeString(str: string): string {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeEmailString(email: string): string {
  return sanitizeString(sanitizeEmail(email));
}

export function isValidFullEmail(email: string): boolean {
  const basicFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicFormatRegex.test(email)) {
    return false;
  }

  const [localPart, domainPart] = email.split('@');

  if (email.length > 254 || localPart.length > 64 || domainPart.length > 253) {
    return false;
  }

  const localPartRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")$/i;
  if (!localPartRegex.test(localPart)) {
    return false;
  }

  const domainPartRegex = /^(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
  if (!domainPartRegex.test(domainPart)) {
    return false;
  }

  return true;
}


export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
  return usernameRegex.test(username);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


export type Constructor<T> = new(...args: unknown[]) => T;

export class BooleanHolder {
  public value: boolean;

  constructor(value: boolean) {
    this.value = value;
  }
}

export class NumberHolder {
  public value: number;

  constructor(value: number) {
    this.value = value;
  }
}

export class IntegerHolder extends NumberHolder {
  constructor(value: integer) {
    super(value);
  }
}

export class FixedInt extends IntegerHolder {
  constructor(value: integer) {
    super(value);
  }
}

export function fixedInt(value: integer): integer {
  return new FixedInt(value) as unknown as integer;
}

/**
 * Formats a string to title case
 * @param unformattedText Text to be formatted
 * @returns the formatted string
 */
export function formatText(unformattedText: string): string {
  const text = unformattedText.split("_");
  for (let i = 0; i < text.length; i++) {
    text[i] = text[i].charAt(0).toUpperCase() + text[i].substring(1).toLowerCase();
  }

  return text.join(" ");
}

export function toCamelCaseString(unformattedText: string): string {
  if (!unformattedText) {
    return "";
  }
  return unformattedText.split(/[_ ]/).filter(f => f).map((f, i) => i ? `${f[0].toUpperCase()}${f.slice(1).toLowerCase()}` : f.toLowerCase()).join("");
}

export function rgbToHsv(r: integer, g: integer, b: integer) {
  const v = Math.max(r, g, b);
  const c = v - Math.min(r, g, b);
  const h = c && ((v === r) ? (g - b) / c : ((v === g) ? 2 + (b - r) / c : 4 + (r - g) / c));
  return [ 60 * (h < 0 ? h + 6 : h), v && c / v, v];
}

/**
 * Compare color difference in RGB
 * @param {Array} rgb1 First RGB color in array
 * @param {Array} rgb2 Second RGB color in array
 */
export function deltaRgb(rgb1: integer[], rgb2: integer[]): integer {
  const [ r1, g1, b1 ] = rgb1;
  const [ r2, g2, b2 ] = rgb2;
  const drp2 = Math.pow(r1 - r2, 2);
  const dgp2 = Math.pow(g1 - g2, 2);
  const dbp2 = Math.pow(b1 - b2, 2);
  const t = (r1 + r2) / 2;

  return Math.ceil(Math.sqrt(2 * drp2 + 4 * dgp2 + 3 * dbp2 + t * (drp2 - dbp2) / 256));
}

export function rgbHexToRgba(hex: string) {
  const color = hex.match(/^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)!; // TODO: is this bang correct?
  return {
    r: parseInt(color[1], 16),
    g: parseInt(color[2], 16),
    b: parseInt(color[3], 16),
    a: 255
  };
}

export function rgbaToInt(rgba: integer[]): integer {
  return (rgba[0] << 24) + (rgba[1] << 16) + (rgba[2] << 8) + rgba[3];
}

/*This function returns true if the current lang is available for some functions
If the lang is not in the function, it usually means that lang is going to use the default english version
This function is used in:
- summary-ui-handler.ts: If the lang is not available, it'll use types.json (english)
English itself counts as not available
*/
export function verifyLang(lang?: string): boolean {
  //IMPORTANT - ONLY ADD YOUR LANG HERE IF YOU'VE ALREADY ADDED ALL THE NECESSARY IMAGES
  if (!lang) {
    lang = i18next.resolvedLanguage;
  }

  switch (lang) {
    case "es":
    case "fr":
    case "de":
    case "it":
  case "zh-CN":
  case "zh-TW":
  case "pt-BR":
    case "ko":
  case "ja":
      return true;
    default:
      return false;
  }
}

/**
 * Prints the type and name of all game objects in a container for debuggin purposes
 * @param container container with game objects inside it
 */
export function printContainerList(container: Phaser.GameObjects.Container): void {
  console.log(container.list.map(go => {
    return {type: go.type, name: go.name};
  }));
}


/**
 * Truncate a string to a specified maximum length and add an ellipsis if it exceeds that length.
 *
 * @param str - The string to be truncated.
 * @param maxLength - The maximum length of the truncated string, defaults to 10.
 * @returns The truncated string with an ellipsis if it was longer than maxLength.
 */
export function truncateString(str: String, maxLength: number = 10) {
  // Check if the string length exceeds the maximum length
  if (str.length > maxLength) {
    // Truncate the string and add an ellipsis
    return str.slice(0, maxLength - 3) + "..."; // Subtract 3 to accommodate the ellipsis
  }
  // Return the original string if it does not exceed the maximum length
  return str;
}

/**
 * Perform a deep copy of an object.
 *
 * @param values - The object to be deep copied.
 * @returns A new object that is a deep copy of the input.
 */
export function deepCopy(values: object): object {
  return JSON.parse(JSON.stringify(values));
}

/**
 * Convert a space-separated string into a capitalized and underscored string.
 *
 * @param input - The string to be converted.
 * @returns The converted string with words capitalized and separated by underscores.
 */
export function reverseValueToKeySetting(input) {
  const words = input.split(" ");
  const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return capitalizedWords.join("_");
}

/**
 * Capitalize a string.
 *
 * @param str - The string to be capitalized.
 * @param sep - The separator between the words of the string.
 * @param lowerFirstChar - Whether the first character of the string should be lowercase or not.
 * @param returnWithSpaces - Whether the returned string should have spaces between the words or not.
 * @returns The capitalized string.
 */
export function capitalizeString(str: string, sep: string, lowerFirstChar: boolean = true, returnWithSpaces: boolean = false) {
  if (str) {
    const splitedStr = str.toLowerCase().split(sep);

    for (let i = +lowerFirstChar; i < splitedStr?.length; i++) {
      splitedStr[i] = splitedStr[i].charAt(0).toUpperCase() + splitedStr[i].substring(1);
    }

    return returnWithSpaces ? splitedStr.join(" ") : splitedStr.join("");
  }
  return null;
}

/**
 * Returns if an object is null or undefined
 * @param object
 */
export function isNullOrUndefined(object: any): boolean {
  return null === object || undefined === object;
}

/**
 * This function is used in the context of a Pokémon battle game to calculate the actual integer damage value from a float result.
 * Many damage calculation formulas involve various parameters and result in float values.
 * The actual damage applied to a Pokémon's HP must be an integer.
 * This function helps in ensuring that by flooring the float value and enforcing a minimum damage value.
 *
 * @param value - The float value to convert.
 * @param minValue - The minimum integer value to return. Defaults to 1.
 * @returns The converted value as an integer.
 */
export function toDmgValue(value: number, minValue: number = 1) {
  return Math.max(Math.floor(value), minValue);
}

/**
 * Helper method to localize a sprite key (e.g. for types)
 * @param baseKey the base key of the sprite (e.g. `type`)
 * @returns the localized sprite key
 */
export function getLocalizedSpriteKey(baseKey: string) {
  return `${baseKey}${verifyLang(i18next.resolvedLanguage) ? `_${i18next.resolvedLanguage}` : ""}`;
}


export function isLocalEnvironment(): boolean {
  return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168");
}


export function randSeedChance(chance: integer): boolean {
  const randomNumber = randSeedInt(100, 1);

  return randomNumber <= chance;
}

export function getRandomUniqueIndices(max: number, count: number): number[] {
  if (count > max) {
    throw new Error("Count cannot be greater than max");
  }

  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(randSeedInt(max));
  }

  return Array.from(indices);
}

export function randSeedFloat(min: number, max: number): number {
  return Phaser.Math.RND.realInRange(min, max);
}


export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}


export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function decompressData(compressedData: Uint8Array): string {
  try {
    if (typeof window !== 'undefined' && (window as any).pako) {
      return (window as any).pako.inflate(compressedData, { to: 'string' });
    } else {
      console.error('Pako library is not available. Make sure it is loaded in your HTML.');
      return new TextDecoder().decode(compressedData);
    }
  } catch (e) {
    console.error('Error decompressing data:', e);
    return Array.from(compressedData)
      .map(byte => String.fromCharCode(byte))
      .join('');
  }
}

function extractPngMetadata(data: Uint8Array): Record<string, string> {
  let pos = 8;
  const chunks: Record<string, string> = {};
  
  while (pos < data.length) {
    const length = (data[pos] << 24) | (data[pos+1] << 16) | (data[pos+2] << 8) | data[pos+3];
    pos += 4;
    
    const chunkType = String.fromCharCode(data[pos], data[pos+1], data[pos+2], data[pos+3]);
    pos += 4;
    
    if (chunkType === 'tEXt') {
      let keywordEnd = pos;
      while (data[keywordEnd] !== 0 && keywordEnd < pos + length) {
        keywordEnd++;
      }
      
      const keyword = Array.from(data.slice(pos, keywordEnd))
        .map(byte => String.fromCharCode(byte))
        .join('');
      
      const textStart = keywordEnd + 1;
      const textEnd = pos + length;
      
      const textValue = Array.from(data.slice(textStart, textEnd))
        .map(byte => String.fromCharCode(byte))
        .join('');
      
      chunks[keyword] = textValue;
    }
    
    pos += length + 4;
  }
  
  return chunks;
}

export default class EmbeddedAtlasFile extends Phaser.Loader.FileTypes.ImageFile {
  constructor(loader: Phaser.Loader.LoaderPlugin, key: string, url: string, xhrSettings?: Phaser.Types.Loader.XHRSettingsObject) {
    super(loader, key, url, xhrSettings);
    
    this.type = 'embeddedAtlas';
  }

  onProcess(): void {
    this.state = Phaser.Loader.FILE_PROCESSING;

    this.data = new Image();
    this.data.crossOrigin = this.crossOrigin || '';

    const _this = this;

    this.data.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(this, 0, 0);
      }
      
      fetch(_this.src)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          const data = new Uint8Array(arrayBuffer);
          
          const metadataChunks = extractPngMetadata(data);
          let jsonData = null;
          
          if (metadataChunks && 'jsonData' in metadataChunks) {
            const isCompressed = metadataChunks['jsonDataCompressed'] === 'true';
            
            if (isCompressed) {
              try {
                const compressedData = base64ToUint8Array(metadataChunks['jsonData']);
                
                const jsonString = decompressData(compressedData);
                
                jsonData = JSON.parse(jsonString);
              } catch (error) {
                console.error('Error processing JSON data:', error);
              }
            }
          }
          
          if (jsonData) {
            if (_this.loader.textureManager) {
              _this.loader.textureManager.addAtlas(_this.key, _this.data, jsonData);
            }
            
            const scene = _this.loader.scene;
            if (scene && scene.cache && scene.cache.json) {
              scene.cache.json.add(_this.key, jsonData);
            }
            
            _this.onProcessComplete();
          } else {
            console.error('No JSON data found in PNG:', _this.key);
            _this.onProcessComplete();
          }
        })
        .catch(error => {
          console.error('Error extracting JSON from PNG:', error);
          _this.onProcessError();
        });
    };

    this.data.onerror = function() {
      _this.onProcessError();
    };

    this.data.src = this.src;
  }

  onProcessComplete(): void {
    this.state = Phaser.Loader.FILE_COMPLETE;
    if (this.loader) {
      this.loader.fileProcessComplete(this);
    }
  }

  onProcessError(): void {
    this.state = Phaser.Loader.FILE_ERRORED;
    if (this.loader) {
      this.loader.fileProcessComplete(this);
    }
  }
}