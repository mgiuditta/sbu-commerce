export class EntityNotFoundException extends Error {
  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} "${value}" not found`);
    this.name = 'EntityNotFoundException';
  }
}
