export function isPrimaryPointer(pointer: Phaser.Input.Pointer): boolean {
  return pointer.button === 0;
}