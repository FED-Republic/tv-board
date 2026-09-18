/** The show does not exist on TVmaze, or the id is not a show id; distinct from a loading failure. */
export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';

  constructor(message = 'Show not found') {
    super(message);
  }
}
