export const HASHING_PORT = Symbol('HASHING_PORT');

export abstract class HashingPort {
  abstract hash(password: string): Promise<string>;
  abstract compare(password: string, hash: string): Promise<boolean>;
}
