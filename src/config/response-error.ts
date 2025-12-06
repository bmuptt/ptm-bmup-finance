export class ResponseError extends Error {
  public messages: string[];

  constructor(
    public status: number,
    messages: string | string[],
  ) {
    // Jika pesan adalah array, gabungkan menjadi satu string untuk dipakai oleh Error
    super(Array.isArray(messages) ? messages.join(', ') : messages);
    this.messages = Array.isArray(messages) ? messages : [messages];
  }
}

