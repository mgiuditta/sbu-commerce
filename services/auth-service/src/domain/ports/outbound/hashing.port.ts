export const HASHING_PORT = Symbol('HASHING_PORT');

export interface HashingPort {
  hash(data: string | Buffer): Promise<string>;
  compare(data: string | Buffer, encrypted: string): Promise<boolean>;
}
