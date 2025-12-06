import { Buffer } from "buffer";
import process from "process";

// Ensure Node globals exist when dependencies expect them in the browser.
if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

if (!globalThis.process) {
  globalThis.process = process;
}
